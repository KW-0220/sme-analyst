/* Vercel 無伺服器函數：接收一份公司銀行月結單 PDF，交由 Claude 讀取並抽取交易，再由程式計算報告。
   - 只在請求期間於記憶體處理文件，不寫入磁碟或資料庫。
   - 回應為 JSON：{ ok: true, report } 或 { ok: false, code, message }。
   環境變數：ANTHROPIC_API_KEY（必須）、SME_MAX_MB（可選，預設 4）、SME_MOCK=1（本地測試，不呼叫 API）。 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildReport } from "./_lib/build-report.js";

const MAX_MB = Number(process.env.SME_MAX_MB || 4);
const MODEL = "claude-opus-5";

const Extraction = z.object({
  is_bank_statement: z.boolean().describe("文件是否公司銀行戶口月結單／對帳單"),
  not_statement_reason: z.string().nullable().describe("如不是月結單，簡短說明文件類型"),
  accounts: z.array(z.object({
    bank_name: z.string().describe("銀行名稱，未能辨識則空字串"),
    account_type: z.string().describe("戶口類型，例如 往來戶口、儲蓄戶口、綜合戶口；未能辨識則空字串"),
    masked_number: z.string().describe("戶口號碼最後 4 位數字，未能辨識則空字串"),
    currency: z.string().describe("ISO 4217 幣種代碼，例如 HKD")
  })).describe("文件內出現的戶口。綜合結單有多個戶口或幣種時逐一列出"),
  statement_period: z.object({ start: z.string(), end: z.string() }).nullable().describe("結單期間，YYYY-MM-DD"),
  opening_balance: z.number().nullable().describe("期初結餘；未能辨識則 null"),
  closing_balance: z.number().nullable().describe("期末結餘；未能辨識則 null"),
  transactions: z.array(z.object({
    date: z.string().describe("交易日期 YYYY-MM-DD"),
    description: z.string().describe("銀行摘要原文，略去重複空格"),
    amount: z.number().describe("金額：進帳為正，支出為負"),
    balance_after: z.number().nullable().describe("該筆交易後文件列出的結餘；文件沒有則 null"),
    page: z.number().int().describe("所在文件頁碼，由 1 起"),
    category: z.enum(["customer_payment", "supplier_payment", "salary", "mpf", "rent", "utilities", "bank_fee", "credit_card", "loan_repayment", "tax", "internal_transfer", "shareholder", "cash", "returned_item", "other", "unknown"]),
    needs_confirmation: z.boolean().describe("摘要不足以確定性質時為 true"),
    confirmation_reason: z.string().nullable()
  })).describe("只包括第一個戶口、第一種幣種的交易"),
  pages_total: z.number().int(),
  pages_readable: z.number().int().describe("可清楚讀取交易內容的頁數"),
  unreadable_notes: z.array(z.string()).describe("缺頁、模糊、被裁切或未能讀取的具體說明；沒有則空陣列"),
  multiple_currencies: z.boolean()
});

const SYSTEM = `你是一個銀行月結單資料抽取器。你會收到一份 PDF，請按輸出格式抽取資料。
規則：
1. 只抽取文件上實際印出的內容。不要推測沒有出現的交易、日期或金額。
2. 金額以文件所示為準：進帳為正數，支出為負數。每筆交易只記一次，不要把結餘欄當作交易。
3. category 只在摘要能明確支持時才分類；不清楚的一律用 unknown 並把 needs_confirmation 設為 true。
   - 客戶名稱或「FPS／轉數快入帳」而無法確定來源時用 customer_payment 並設 needs_confirmation 為 true。
   - 轉往其他戶口號碼、或摘要為 TRANSFER TO 之類用 internal_transfer。
   - 摘要含股東、董事、DIRECTOR、SHAREHOLDER 字樣用 shareholder。
   - 退票、RETURNED、UNPAID、DISHONOURED、REJECTED 用 returned_item。
4. 如文件為綜合結單而包含多個戶口或幣種，accounts 逐一列出，multiple_currencies 按實際情況填寫，transactions 只包括第一個戶口的第一種幣種。
5. pages_readable 少於 pages_total 或內容模糊、被裁切時，在 unreadable_notes 寫明是哪一頁、影響哪些日期。
6. 描述文字使用文件原文；說明文字使用繁體中文。`;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "latin1");
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, code: "method", message: "只接受 POST。" });

  let buf;
  try { buf = await readBody(req); } catch (e) { return json(res, 400, { ok: false, code: "body", message: "未能讀取上載內容，請重試。" }); }

  if (!buf || buf.length < 100) return json(res, 400, { ok: false, code: "empty", message: "沒有收到文件。" });
  if (buf.length > MAX_MB * 1024 * 1024) return json(res, 413, { ok: false, code: "too_large", message: `檔案超過系統上限 ${MAX_MB} MB。請換用較小的完整 PDF，不要刪去交易頁。` });
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") return json(res, 415, { ok: false, code: "not_pdf", message: "請上載 PDF 格式的公司銀行月結單。" });
  if (buf.subarray(Math.max(0, buf.length - 65536)).toString("latin1").includes("/Encrypt")) {
    return json(res, 415, { ok: false, code: "encrypted", message: "此 PDF 已加密，請使用你有權開啟的未加密副本。系統不會收集網上銀行密碼。" });
  }

  const reportId = "r_" + Math.random().toString(36).slice(2, 10);

  let extracted;
  if (process.env.SME_MOCK === "1") {
    extracted = mockExtraction();
  } else {
    if (!process.env.ANTHROPIC_API_KEY) return json(res, 500, { ok: false, code: "no_api_key", message: "伺服器未設定 AI 服務金鑰（ANTHROPIC_API_KEY），請聯絡網站管理員。" });
    const client = new Anthropic();
    let response;
    try {
      response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium", format: zodOutputFormat(Extraction) },
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } },
            { type: "text", text: "請抽取這份文件的資料。" }
          ]
        }]
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) return json(res, 500, { ok: false, code: "auth", message: "AI 服務金鑰無效，請聯絡網站管理員。" });
      if (error instanceof Anthropic.RateLimitError) return json(res, 503, { ok: false, code: "rate_limit", message: "系統目前繁忙，請稍後重試。" });
      if (error instanceof Anthropic.BadRequestError) return json(res, 400, { ok: false, code: "bad_request", message: "未能處理此文件（" + error.message.slice(0, 120) + "）。請確認是完整、未加密的 PDF。" });
      if (error instanceof Anthropic.APIError) return json(res, 502, { ok: false, code: "api", message: "AI 服務暫時未能回應（" + error.status + "），請稍後重試。" });
      return json(res, 500, { ok: false, code: "server", message: "今次未能完成分析，請重試或更換文件。" });
    }
    if (response.stop_reason === "refusal") return json(res, 422, { ok: false, code: "refusal", message: "AI 服務拒絕處理此文件。請確認文件為公司銀行月結單。" });
    if (response.stop_reason === "max_tokens") return json(res, 422, { ok: false, code: "too_long", message: "文件內容過長，未能一次處理完成。請改用單一戶口、單一月份的月結單。" });
    extracted = response.parsed_output;
    if (!extracted) return json(res, 502, { ok: false, code: "parse", message: "AI 服務回應格式不完整，請重試。" });
  }

  if (!extracted.is_bank_statement) {
    return json(res, 422, { ok: false, code: "not_statement", message: "這份文件看來不是公司銀行月結單" + (extracted.not_statement_reason ? "（" + extracted.not_statement_reason + "）" : "") + "。簡單版只接受公司銀行月結單 PDF。" });
  }
  if (!extracted.accounts.length || !extracted.statement_period) {
    return json(res, 422, { ok: false, code: "unreadable", message: "未能完整讀取月結單，請重新上載全部頁面的清晰版本。" });
  }
  if (extracted.multiple_currencies || extracted.accounts.length > 1) {
    const list = extracted.accounts.map(a => [a.account_type, a.masked_number ? "•••• " + a.masked_number : "", a.currency].filter(Boolean).join(" ")).join("；");
    return json(res, 422, { ok: false, code: "multi_account", message: "此文件包含多個戶口或幣種（" + list + "）。初期每次只分析一個戶口、一種幣種，請上載單一戶口版本的月結單。" });
  }
  if (!extracted.transactions.length) {
    return json(res, 422, { ok: false, code: "no_transactions", message: "文件內未能讀取任何交易。請確認 PDF 包含交易明細頁，並非只有封面或摘要頁。" });
  }
  if (extracted.pages_readable === 0) {
    return json(res, 422, { ok: false, code: "unreadable", message: "未能完整讀取月結單，請重新上載全部頁面的清晰版本。" });
  }

  const report = buildReport(extracted, { reportId });
  return json(res, 200, { ok: true, report });
}

/* 本地測試用的模擬抽取結果（SME_MOCK=1） */
function mockExtraction() {
  return {
    is_bank_statement: true, not_statement_reason: null,
    accounts: [{ bank_name: "測試銀行", account_type: "往來戶口", masked_number: "4821", currency: "HKD" }],
    statement_period: { start: "2026-07-01", end: "2026-07-31" },
    opening_balance: 80000, closing_balance: 50000,
    transactions: [
      { date: "2026-07-02", description: "FPS CREDIT ABC TRADING", amount: 85000, balance_after: 165000, page: 1, category: "customer_payment", needs_confirmation: true, confirmation_reason: null },
      { date: "2026-07-03", description: "AUTOPAY RENT", amount: -48000, balance_after: 117000, page: 1, category: "rent", needs_confirmation: false, confirmation_reason: null },
      { date: "2026-07-05", description: "AUTOPAY SALARY", amount: -96000, balance_after: 21000, page: 1, category: "salary", needs_confirmation: false, confirmation_reason: null },
      { date: "2026-07-08", description: "CHEQUE DEPOSIT", amount: 60000, balance_after: 81000, page: 2, category: "unknown", needs_confirmation: true, confirmation_reason: "支票入帳未列來源" },
      { date: "2026-07-10", description: "TT PAYMENT SUPPLIER", amount: -72000, balance_after: 9000, page: 2, category: "supplier_payment", needs_confirmation: false, confirmation_reason: null },
      { date: "2026-07-15", description: "FPS CREDIT", amount: 40000, balance_after: 49000, page: 2, category: "customer_payment", needs_confirmation: true, confirmation_reason: null },
      { date: "2026-07-16", description: "MPF CONTRIBUTION", amount: -9600, balance_after: 39400, page: 2, category: "mpf", needs_confirmation: false, confirmation_reason: null },
      { date: "2026-07-18", description: "SERVICE CHARGE", amount: -350, balance_after: 39050, page: 2, category: "bank_fee", needs_confirmation: false, confirmation_reason: null },
      { date: "2026-07-19", description: "TRANSFER TO 7730", amount: -30000, balance_after: 9050, page: 3, category: "internal_transfer", needs_confirmation: true, confirmation_reason: null },
      { date: "2026-07-22", description: "FPS CREDIT", amount: 55000, balance_after: 64050, page: 3, category: "customer_payment", needs_confirmation: true, confirmation_reason: null },
      { date: "2026-07-24", description: "AUTOPAY UTILITIES", amount: -6050, balance_after: 58000, page: 3, category: "utilities", needs_confirmation: false, confirmation_reason: null },
      { date: "2026-07-26", description: "CREDIT CARD PAYMENT", amount: -18000, balance_after: 40000, page: 3, category: "credit_card", needs_confirmation: false, confirmation_reason: null },
      { date: "2026-07-28", description: "TRANSFER FROM DIRECTOR", amount: 60000, balance_after: 100000, page: 3, category: "shareholder", needs_confirmation: true, confirmation_reason: null },
      { date: "2026-07-30", description: "TT PAYMENT SUPPLIER", amount: -50000, balance_after: 50000, page: 4, category: "supplier_payment", needs_confirmation: false, confirmation_reason: null }
    ],
    pages_total: 4, pages_readable: 4, unreadable_notes: [], multiple_currencies: false
  };
}
