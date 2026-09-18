/* 抽取結果的資料結構：Claude 用 zod 產生結構化輸出；Gemini 用對應的 responseSchema，回傳後同樣以 zod 驗證。 */
import { z } from "zod";

export const CATEGORIES = ["customer_payment", "supplier_payment", "salary", "mpf", "rent", "utilities", "bank_fee", "credit_card", "loan_repayment", "tax", "internal_transfer", "shareholder", "cash", "returned_item", "other", "unknown"];

export const Extraction = z.object({
  is_bank_statement: z.boolean().describe("文件是否公司銀行戶口月結單／對帳單"),
  not_statement_reason: z.string().nullable().describe("如不是月結單，簡短說明文件類型"),
  accounts: z.array(z.object({
    bank_name: z.string().describe("銀行名稱，未能辨識則空字串"),
    account_type: z.string().describe("戶口類型，例如 往來戶口、儲蓄戶口、綜合戶口；未能辨識則空字串"),
    masked_number: z.string().describe("戶口號碼最後 4 位數字，未能辨識則空字串"),
    currency: z.string().describe("ISO 4217 幣種代碼，例如 HKD"),
    opening_balance: z.number().nullable().describe("此戶口此幣種的期初結餘；未能辨識則 null"),
    closing_balance: z.number().nullable().describe("此戶口此幣種的期末結餘；未能辨識則 null")
  })).describe("文件內出現的戶口。綜合結單有多個戶口或幣種時逐一列出；同一戶口有多種幣種時，每種幣種各列一項"),
  statement_period: z.object({ start: z.string(), end: z.string() }).nullable().describe("結單期間，YYYY-MM-DD"),
  transactions: z.array(z.object({
    account_index: z.number().int().describe("所屬戶口在 accounts 內的索引，由 0 起"),
    date: z.string().describe("交易日期 YYYY-MM-DD"),
    description: z.string().describe("銀行摘要原文，略去重複空格"),
    amount: z.number().describe("金額：進帳為正，支出為負"),
    balance_after: z.number().nullable().describe("該筆交易後文件列出的結餘；文件沒有則 null"),
    page: z.number().int().describe("所在文件頁碼，由 1 起"),
    category: z.enum(CATEGORIES),
    needs_confirmation: z.boolean().describe("摘要不足以確定性質時為 true"),
    confirmation_reason: z.string().nullable()
  })).describe("文件內全部戶口的交易，各以 account_index 標明所屬戶口；期初／期末結餘行不是交易"),
  pages_total: z.number().int(),
  pages_readable: z.number().int().describe("可清楚讀取交易內容的頁數"),
  unreadable_notes: z.array(z.string()).describe("缺頁、模糊、被裁切或未能讀取的具體說明；沒有則空陣列"),
  multiple_currencies: z.boolean()
});

export const SYSTEM_PROMPT = `你是一個銀行月結單資料抽取器。你會收到一份 PDF，請按輸出格式抽取資料。
規則：
1. 只抽取文件上實際印出的內容。不要推測沒有出現的交易、日期或金額。
2. 金額以文件所示為準：進帳為正數，支出為負數。每筆交易只記一次；期初結餘（B/F）、期末結餘（C/F）及小計行不是交易，不要列入 transactions。
3. category 只在摘要能明確支持時才分類；不清楚的一律用 unknown 並把 needs_confirmation 設為 true。
   - 客戶名稱或「FPS／轉數快入帳」而無法確定來源時用 customer_payment 並設 needs_confirmation 為 true。
   - 轉往其他戶口號碼、或摘要為 TRANSFER TO 之類用 internal_transfer。
   - 摘要含股東、董事、DIRECTOR、SHAREHOLDER 字樣用 shareholder。
   - 退票、RETURNED、UNPAID、DISHONOURED、REJECTED 用 returned_item。
4. 如文件為綜合結單而包含多個戶口或幣種，accounts 逐一列出（同一戶口的不同幣種各列一項），每項填上該戶口該幣種的期初及期末結餘；transactions 包括全部戶口的交易，並以所屬戶口索引標明。multiple_currencies 只在 accounts 內出現多於一種幣種時為 true。
7. 交易摘要保留原文但刪去多餘空格及純裝飾字元；每筆交易只輸出必要欄位，不要加入額外文字。
5. pages_readable 少於 pages_total 或內容模糊、被裁切時，在 unreadable_notes 寫明是哪一頁、影響哪些日期。
6. 日期一律轉為 YYYY-MM-DD；年份以結單期間為準。描述文字使用文件原文；說明文字使用繁體中文。`;

/* Gemini 傳輸用的精簡結構：交易欄位用短鍵以減少輸出 token，伺服器收到後還原為完整欄位名。
   i=account_index d=date t=description a=amount b=balance_after p=page c=category q=needs_confirmation */
export function expandCompact(raw) {
  if (!raw || !Array.isArray(raw.transactions)) return raw;
  return Object.assign({}, raw, {
    transactions: raw.transactions.map(t => ("t" in t || "q" in t) ? {
      account_index: t.i, date: t.d, description: t.t, amount: t.a, balance_after: t.b === undefined ? null : t.b,
      page: t.p, category: t.c, needs_confirmation: !!t.q, confirmation_reason: null
    } : t)
  });
}

/* Gemini responseSchema（OpenAPI 子集） */
const S = (type, extra) => Object.assign({ type }, extra || {});
export const GEMINI_SCHEMA = S("OBJECT", {
  properties: {
    is_bank_statement: S("BOOLEAN"),
    not_statement_reason: S("STRING", { nullable: true }),
    accounts: S("ARRAY", { items: S("OBJECT", { properties: { bank_name: S("STRING"), account_type: S("STRING"), masked_number: S("STRING"), currency: S("STRING"), opening_balance: S("NUMBER", { nullable: true }), closing_balance: S("NUMBER", { nullable: true }) }, required: ["bank_name", "account_type", "masked_number", "currency", "opening_balance", "closing_balance"] }) }),
    statement_period: S("OBJECT", { nullable: true, properties: { start: S("STRING"), end: S("STRING") }, required: ["start", "end"] }),
    transactions: S("ARRAY", { items: S("OBJECT", {
      description: "每筆交易。i=所屬戶口索引 d=日期YYYY-MM-DD t=摘要原文 a=金額(進帳正/支出負) b=交易後結餘(無則null) p=頁碼 c=分類 q=需要確認",
      properties: {
        i: S("INTEGER"), d: S("STRING"), t: S("STRING"), a: S("NUMBER"), b: S("NUMBER", { nullable: true }), p: S("INTEGER"),
        c: S("STRING", { enum: CATEGORIES }), q: S("BOOLEAN")
      },
      required: ["i", "d", "t", "a", "b", "p", "c", "q"]
    }) }),
    pages_total: S("INTEGER"),
    pages_readable: S("INTEGER"),
    unreadable_notes: S("ARRAY", { items: S("STRING") }),
    multiple_currencies: S("BOOLEAN")
  },
  required: ["is_bank_statement", "not_statement_reason", "accounts", "statement_period", "transactions", "pages_total", "pages_readable", "unreadable_notes", "multiple_currencies"]
});
