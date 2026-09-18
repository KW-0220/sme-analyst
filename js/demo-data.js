/* 示範報告數據：全部為虛構資料，只用於版面展示，不得混入真實分析。
   isFictional 為 true 時，報告頁會常駐顯示「虛構資料示範」標記。 */
window.SME_DEMO_REPORT = {
  isFictional: true,
  reportId: "demo",
  period: { label: "2026 年 7 月", start: "2026-07-01", end: "2026-07-31", isLatestMonth: false },
  currency: "HKD",
  account: { bankLabel: "銀行往來戶口", maskedNumber: "•••• 4821", holder: "（示範）虛構貿易有限公司" },
  document: { pagesRead: 4, pagesTotal: 4, complete: true, notes: [] },
  openingBalance: 80000,
  totalIn: 300000,
  totalOut: 330000,
  closingBalance: 50000,
  dailyBalanceComplete: false,
  summary: "本月此戶口支出比進帳多 HK$30,000，期末結餘由 HK$80,000 減至 HK$50,000。這反映期內戶口資金變化，未能單憑此判斷公司是否虧損。",
  transactions: [
    { date: "2026-07-02", desc: "轉數快入帳 — ABC TRADING", amount: 85000, category: "客戶付款（待確認）", confirm: true, page: 1, balance: 165000 },
    { date: "2026-07-03", desc: "自動轉帳 — 物業管理公司 租金", amount: -48000, category: "租金", page: 1, balance: 117000 },
    { date: "2026-07-05", desc: "自動轉帳 — 薪金（多筆）", amount: -96000, category: "薪金", page: 1, balance: 21000 },
    { date: "2026-07-08", desc: "支票存入", amount: 60000, category: "待確認", confirm: true, page: 2, balance: 81000 },
    { date: "2026-07-10", desc: "電匯 — 供應商 貨款", amount: -72000, category: "供應商付款", page: 2, balance: 9000 },
    { date: "2026-07-15", desc: "轉數快入帳 — 客戶", amount: 40000, category: "客戶付款（待確認）", confirm: true, page: 2, balance: 49000 },
    { date: "2026-07-16", desc: "自動轉帳 — 強積金供款", amount: -9600, category: "強積金", page: 2, balance: 39400 },
    { date: "2026-07-18", desc: "銀行服務費", amount: -350, category: "銀行費用", page: 2, balance: 39050 },
    { date: "2026-07-19", desc: "轉帳至戶口 •••• 7730", amount: -30000, category: "待確認（可能為內部轉帳）", confirm: true, page: 3, balance: 9050 },
    { date: "2026-07-22", desc: "轉數快入帳 — 客戶", amount: 55000, category: "客戶付款（待確認）", confirm: true, page: 3, balance: 64050 },
    { date: "2026-07-24", desc: "自動轉帳 — 電力及水費", amount: -6050, category: "水電費", page: 3, balance: 58000 },
    { date: "2026-07-26", desc: "信用卡還款", amount: -18000, category: "信用卡還款", page: 3, balance: 40000 },
    { date: "2026-07-28", desc: "轉帳入帳 — 股東", amount: 60000, category: "待確認（可能為股東注資或借款）", confirm: true, page: 3, balance: 100000 },
    { date: "2026-07-30", desc: "電匯 — 供應商 貨款", amount: -50000, category: "供應商付款", page: 4, balance: 50000 }
  ],
  attention: [
    {
      category: "本月支出高於進帳",
      title: "本月支出高於進帳",
      observation: "本月此戶口支出 HK$330,000，進帳 HK$300,000，淨流出 HK$30,000。",
      confirm: "當中是否包含一次性支出或轉往其他公司戶口的款項？單憑這項差額未能判斷公司是否虧損。",
      evidence: [
        { date: "2026-07-05", desc: "薪金（多筆）", amount: "−HK$96,000", page: 1 },
        { date: "2026-07-10", desc: "供應商貨款", amount: "−HK$72,000", page: 2 },
        { date: "2026-07-19", desc: "轉帳至戶口 •••• 7730", amount: "−HK$30,000", page: 3 }
      ]
    },
    {
      category: "結餘低位",
      title: "結餘於 7 月 10 日跌至 HK$9,000",
      observation: "支付供應商貨款後，交易日結餘跌至本月最低位 HK$9,000；7 月 19 日轉帳後再跌至 HK$9,050。",
      confirm: "這兩段時間是否有其他已安排的付款？如有自動轉帳或到期款項落在同一時段，結餘可能不足以支付。",
      evidence: [
        { date: "2026-07-10", desc: "電匯 — 供應商 貨款", amount: "−HK$72,000", page: 2 },
        { date: "2026-07-19", desc: "轉帳至戶口 •••• 7730", amount: "−HK$30,000", page: 3 }
      ]
    },
    {
      category: "待確認的轉出",
      title: "7 月 19 日轉出 HK$30,000 至另一戶口",
      observation: "摘要顯示款項轉至戶口 •••• 7730，文件內未有說明該戶口性質。",
      confirm: "這筆是否公司自己另一個戶口的內部轉帳？如屬內部轉帳，本月實際對外支出會較 HK$330,000 為低。",
      evidence: [{ date: "2026-07-19", desc: "轉帳至戶口 •••• 7730", amount: "−HK$30,000", page: 3 }]
    },
    {
      category: "待確認的進帳",
      title: "7 月 28 日進帳 HK$60,000 標示為股東轉入",
      observation: "摘要顯示款項由股東轉入。此類進帳一般不屬客戶付款。",
      confirm: "這筆是否股東注資或借款？如屬注資或借款，本月來自客戶的進帳會較 HK$300,000 為低。",
      evidence: [{ date: "2026-07-28", desc: "轉帳入帳 — 股東", amount: "+HK$60,000", page: 3 }]
    }
  ],
  notFound: ["文件內未見銀行明確標示的退票或扣款失敗紀錄。"],
  nextSteps: [
    "請確認 7 月 19 日轉出的 HK$30,000 是否轉往公司另一個戶口。",
    "請確認 7 月 28 日股東轉入的 HK$60,000 屬注資、借款還是其他款項。",
    "請確認 7 月 2 日、8 日、15 日及 22 日共 HK$240,000 的進帳是否全部為客戶付款。",
    "請回看 7 月 10 日至 15 日及 7 月 19 日至 22 日兩段結餘低位期間，有沒有延後或未能支付的款項。"
  ]
};
