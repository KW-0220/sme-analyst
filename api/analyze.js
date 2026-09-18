/* Vercel 無伺服器函數：接收一份公司銀行月結單 PDF，交由 Claude 讀取並抽取交易，再由程式計算報告。
   - 只在請求期間於記憶體處理文件，不寫入磁碟或資料庫。
   - 回應為 JSON：{ ok: true, report } 或 { ok: false, code, message }。
   環境變數（設定其一）：GEMINI_API_KEY（Google Gemini）或 ANTHROPIC_API_KEY（Claude）。兩者都有時優先用 Gemini。
   可選：GEMINI_MODEL（預設 gemini-3.5-flash）、CLAUDE_MODEL（預設 claude-opus-5）、SME_MAX_MB（預設 4）、SME_MOCK=1（本地測試，不呼叫 API）。 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildReport, accountLabel } from "./_lib/build-report.js";
import { Extraction, SYSTEM_PROMPT } from "./_lib/schema.js";
import { extractWithGemini } from "./_lib/gemini.js";

const MAX_MB = Number(process.env.SME_MAX_MB || 4);
/* 金鑰名稱：以 GEMINI_API_KEY 為準，亦接受 Gemini_Key／GEMINI_KEY */
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.Gemini_Key || process.env.GEMINI_KEY || "";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

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
  const t0 = Date.now();
  const log = (stage, extra) => console.log(JSON.stringify(Object.assign({ stage, reportId, ms: Date.now() - t0, bytes: buf.length }, extra || {})));

  let extracted;
  if (process.env.SME_MOCK === "1") {
    extracted = mockExtraction();
  } else if (GEMINI_KEY) {
    const r = await extractWithGemini(buf, { apiKey: GEMINI_KEY, model: GEMINI_MODEL });
    log("gemini", { ok: r.ok, code: r.code || null, usage: r.usage || null, model: GEMINI_MODEL });
    if (!r.ok) return json(res, r.code === "auth" ? 500 : r.code === "rate_limit" ? 503 : r.code === "api" ? 502 : 422, { ok: false, code: r.code, message: r.message });
    extracted = r.extracted;
  } else if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic();
    let response;
    try {
      response = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
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
  } else {
    return json(res, 500, { ok: false, code: "no_api_key", message: "伺服器未設定 AI 服務金鑰（GEMINI_API_KEY 或 ANTHROPIC_API_KEY），請聯絡網站管理員。" });
  }

  if (!extracted.is_bank_statement) {
    return json(res, 422, { ok: false, code: "not_statement", message: "這份文件看來不是公司銀行月結單" + (extracted.not_statement_reason ? "（" + extracted.not_statement_reason + "）" : "") + "。簡單版只接受公司銀行月結單 PDF。" });
  }
  if (!extracted.accounts.length || !extracted.statement_period) {
    return json(res, 422, { ok: false, code: "unreadable", message: "未能完整讀取月結單，請重新上載全部頁面的清晰版本。" });
  }
  if (!extracted.transactions.length) {
    return json(res, 422, { ok: false, code: "no_transactions", message: "文件內未能讀取任何交易。請確認 PDF 包含交易明細頁，並非只有封面或摘要頁。" });
  }
  if (extracted.pages_readable === 0) {
    return json(res, 422, { ok: false, code: "unreadable", message: "未能完整讀取月結單，請重新上載全部頁面的清晰版本。" });
  }

  /* 綜合結單：每個戶口、每種幣種各自成一份報告，不同幣種不相加 */
  const reports = extracted.accounts.map((acct, i) => {
    const count = extracted.transactions.filter(t => t.account_index === i && t.amount !== 0).length;
    if (!count) return { accountIndex: i, accountLabel: accountLabel(acct), empty: true, note: "此戶口在結單期間沒有交易紀錄。" };
    return buildReport(extracted, { reportId: reportId + "_" + i, accountIndex: i });
  });
  if (!reports.some(r => !r.empty)) {
    return json(res, 422, { ok: false, code: "no_transactions", message: "文件內的戶口在結單期間都沒有交易紀錄。" });
  }
  const first = reports.find(r => !r.empty);
  log("done", { accounts: reports.length, transactions: extracted.transactions.length, pages: extracted.pages_total });
  return json(res, 200, { ok: true, report: first, reports });
}

/* 本地測試用的模擬抽取結果（SME_MOCK=1） */
function mockExtraction() {
  return {
    is_bank_statement: true, not_statement_reason: null,
    accounts: [{ bank_name: "測試銀行", account_type: "往來戶口", masked_number: "4821", currency: "HKD", opening_balance: 80000, closing_balance: 50000 }],
    statement_period: { start: "2026-07-01", end: "2026-07-31" },
    transactions: [
      { account_index: 0, date: "2026-07-02", description: "FPS CREDIT ABC TRADING", amount: 85000, balance_after: 165000, page: 1, category: "customer_payment", needs_confirmation: true, confirmation_reason: null },
      { account_index: 0, date: "2026-07-03", description: "AUTOPAY RENT", amount: -48000, balance_after: 117000, page: 1, category: "rent", needs_confirmation: false, confirmation_reason: null },
      { account_index: 0, date: "2026-07-05", description: "AUTOPAY SALARY", amount: -96000, balance_after: 21000, page: 1, category: "salary", needs_confirmation: false, confirmation_reason: null },
      { account_index: 0, date: "2026-07-08", description: "CHEQUE DEPOSIT", amount: 60000, balance_after: 81000, page: 2, category: "unknown", needs_confirmation: true, confirmation_reason: "支票入帳未列來源" },
      { account_index: 0, date: "2026-07-10", description: "TT PAYMENT SUPPLIER", amount: -72000, balance_after: 9000, page: 2, category: "supplier_payment", needs_confirmation: false, confirmation_reason: null },
      { account_index: 0, date: "2026-07-15", description: "FPS CREDIT", amount: 40000, balance_after: 49000, page: 2, category: "customer_payment", needs_confirmation: true, confirmation_reason: null },
      { account_index: 0, date: "2026-07-16", description: "MPF CONTRIBUTION", amount: -9600, balance_after: 39400, page: 2, category: "mpf", needs_confirmation: false, confirmation_reason: null },
      { account_index: 0, date: "2026-07-18", description: "SERVICE CHARGE", amount: -350, balance_after: 39050, page: 2, category: "bank_fee", needs_confirmation: false, confirmation_reason: null },
      { account_index: 0, date: "2026-07-19", description: "TRANSFER TO 7730", amount: -30000, balance_after: 9050, page: 3, category: "internal_transfer", needs_confirmation: true, confirmation_reason: null },
      { account_index: 0, date: "2026-07-22", description: "FPS CREDIT", amount: 55000, balance_after: 64050, page: 3, category: "customer_payment", needs_confirmation: true, confirmation_reason: null },
      { account_index: 0, date: "2026-07-24", description: "AUTOPAY UTILITIES", amount: -6050, balance_after: 58000, page: 3, category: "utilities", needs_confirmation: false, confirmation_reason: null },
      { account_index: 0, date: "2026-07-26", description: "CREDIT CARD PAYMENT", amount: -18000, balance_after: 40000, page: 3, category: "credit_card", needs_confirmation: false, confirmation_reason: null },
      { account_index: 0, date: "2026-07-28", description: "TRANSFER FROM DIRECTOR", amount: 60000, balance_after: 100000, page: 3, category: "shareholder", needs_confirmation: true, confirmation_reason: null },
      { account_index: 0, date: "2026-07-30", description: "TT PAYMENT SUPPLIER", amount: -50000, balance_after: 50000, page: 4, category: "supplier_payment", needs_confirmation: false, confirmation_reason: null }
    ],
    pages_total: 4, pages_readable: 4, unreadable_notes: [], multiple_currencies: false
  };
}
