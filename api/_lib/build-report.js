/* 由 Claude 抽取的結構化資料計算報告。所有數字由程式計算，不由模型口述。 */

const MONTH_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function currencyPrefix(code) {
  return code === "HKD" ? "HK$" : code + " ";
}

function fmt(n, code) {
  const sign = n < 0 ? "−" : "";
  return sign + currencyPrefix(code) + Math.abs(Math.round(n)).toLocaleString("en-HK");
}

function periodLabel(start, end) {
  const s = MONTH_RE.exec(start), e = MONTH_RE.exec(end);
  if (s && e && s[1] === e[1] && s[2] === e[2] && s[3] === "01") {
    return `${s[1]} 年 ${parseInt(s[2], 10)} 月`;
  }
  return `${start} 至 ${end}`;
}

function isLatestMonth(end, now = new Date()) {
  const e = new Date(end + "T00:00:00Z");
  return (now - e) / 86400000 <= 45;
}

function dayLabel(d) {
  const m = MONTH_RE.exec(d);
  return m ? `${parseInt(m[2], 10)} 月 ${parseInt(m[3], 10)} 日` : d;
}

/* extracted: 由 api/analyze.js 的 zod schema 驗證後的物件 */
export function buildReport(extracted, opts) {
  const { reportId } = opts;
  const acct = extracted.accounts[0];
  const cur = acct.currency;
  const txs = extracted.transactions
    .filter(t => t.amount !== 0)
    .map(t => ({ ...t }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.page - b.page)));

  const opening = extracted.opening_balance;
  const closing = extracted.closing_balance;
  const totalIn = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = txs.filter(t => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const net = totalIn - totalOut;

  /* 交易日結餘：文件有列出結餘時採用；否則由期初推算並標記 */
  let running = opening;
  let balancesDerived = false;
  txs.forEach(t => {
    if (typeof t.balance_after === "number") {
      running = t.balance_after;
    } else if (typeof running === "number") {
      running = running + t.amount;
      balancesDerived = true;
    }
    t.balance = typeof running === "number" ? Math.round(running * 100) / 100 : null;
  });

  const complete = extracted.pages_readable >= extracted.pages_total && extracted.unreadable_notes.length === 0;
  const docNotes = [...extracted.unreadable_notes];
  if (balancesDerived) docNotes.push("文件未逐筆列出結餘，交易日結餘由期初結餘與交易金額推算。");

  const withBalance = txs.filter(t => typeof t.balance === "number");
  const low = withBalance.length ? withBalance.reduce((a, b) => (b.balance < a.balance ? b : a), withBalance[0]) : null;

  /* 分類文字 */
  const catLabel = {
    customer_payment: "客戶付款（待確認）", supplier_payment: "供應商付款", salary: "薪金", mpf: "強積金", rent: "租金",
    utilities: "水電費", bank_fee: "銀行費用", credit_card: "信用卡還款", loan_repayment: "貸款還款", tax: "稅務",
    internal_transfer: "待確認（可能為內部轉帳）", shareholder: "待確認（可能為股東注資或借款）", cash: "現金存提",
    returned_item: "退票／扣款失敗", other: "其他", unknown: "待確認"
  };
  const transactions = txs.map(t => ({
    date: t.date,
    desc: t.description,
    amount: Math.round(t.amount * 100) / 100,
    category: catLabel[t.category] || "待確認",
    confirm: !!t.needs_confirmation || ["customer_payment", "internal_transfer", "shareholder", "unknown"].includes(t.category),
    page: t.page,
    balance: t.balance
  }));
  const confirmCount = transactions.filter(t => t.confirm).length;

  /* 留意事項：只寫文件可支持的觀察 */
  const attention = [];
  const evidenceOf = t => ({ date: t.date, desc: t.description, amount: (t.amount > 0 ? "+" : "−") + fmt(Math.abs(t.amount), cur), page: t.page });
  const bigOut = txs.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 3);
  const bigIn = txs.filter(t => t.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 3);

  if (net < 0) {
    attention.push({
      category: "本月支出高於進帳", title: "本月支出高於進帳",
      observation: `本月此戶口支出 ${fmt(totalOut, cur)}，進帳 ${fmt(totalIn, cur)}，淨流出 ${fmt(-net, cur)}。`,
      confirm: "當中是否包含一次性支出或轉往其他公司戶口的款項？單憑這項差額未能判斷公司是否虧損。",
      evidence: bigOut.map(evidenceOf)
    });
  } else if (net > 0) {
    attention.push({
      category: "本月進帳高於支出", title: "本月進帳高於支出",
      observation: `本月此戶口進帳 ${fmt(totalIn, cur)}，支出 ${fmt(totalOut, cur)}，淨流入 ${fmt(net, cur)}。`,
      confirm: "進帳中是否包含股東注資、貸款或內部轉帳？銀行戶口淨流入不等於公司盈利。",
      evidence: bigIn.map(evidenceOf)
    });
  }

  if (low && typeof opening === "number" && low.balance < opening) {
    const nearLow = withBalance.filter(t => t !== low && t.balance <= low.balance * 1.15).slice(0, 2);
    attention.push({
      category: "結餘低位", title: `結餘於 ${dayLabel(low.date)} 跌至 ${fmt(low.balance, cur)}`,
      observation: `${dayLabel(low.date)} 的交易後，交易日結餘跌至本月最低位 ${fmt(low.balance, cur)}。` + (nearLow.length ? `${nearLow.map(t => dayLabel(t.date)).join("、")} 亦接近此水平。` : ""),
      confirm: "這段時間是否有其他已安排的付款？如有自動轉帳或到期款項落在同一時段，結餘可能不足以支付。",
      evidence: [low, ...nearLow].map(evidenceOf)
    });
  }

  const transfersOut = txs.filter(t => t.category === "internal_transfer" && t.amount < 0);
  if (transfersOut.length) {
    const sum = transfersOut.reduce((s, t) => s - t.amount, 0);
    attention.push({
      category: "待確認的轉出", title: transfersOut.length === 1 ? `${dayLabel(transfersOut[0].date)} 轉出 ${fmt(sum, cur)} 至另一戶口` : `${transfersOut.length} 筆合共 ${fmt(sum, cur)} 轉往其他戶口`,
      observation: "摘要顯示款項轉往其他戶口，文件內未有說明該戶口性質。",
      confirm: `這些是否公司自己另一個戶口的內部轉帳？如屬內部轉帳，本月實際對外支出會較 ${fmt(totalOut, cur)} 為低。`,
      evidence: transfersOut.slice(0, 4).map(evidenceOf)
    });
  }

  const shareholderIn = txs.filter(t => t.category === "shareholder" && t.amount > 0);
  if (shareholderIn.length) {
    const sum = shareholderIn.reduce((s, t) => s + t.amount, 0);
    attention.push({
      category: "待確認的進帳", title: `${shareholderIn.length === 1 ? dayLabel(shareholderIn[0].date) + " " : ""}進帳 ${fmt(sum, cur)} 標示為股東轉入`,
      observation: "摘要顯示款項由股東轉入。此類進帳一般不屬客戶付款。",
      confirm: `這是否股東注資或借款？如屬注資或借款，本月來自客戶的進帳會較 ${fmt(totalIn, cur)} 為低。`,
      evidence: shareholderIn.slice(0, 4).map(evidenceOf)
    });
  }

  const returned = txs.filter(t => t.category === "returned_item");
  if (returned.length) {
    attention.push({
      category: "退票或扣款失敗", title: `文件標示 ${returned.length} 筆退票或扣款失敗`,
      observation: "銀行在摘要中明確標示以下項目為退票或扣款失敗。",
      confirm: "請確認相關款項其後有否重新收妥或支付，以及是否產生額外費用。",
      evidence: returned.slice(0, 4).map(evidenceOf)
    });
  }

  const unknownBig = txs.filter(t => t.category === "unknown" || (t.needs_confirmation && !["internal_transfer", "shareholder", "returned_item", "customer_payment"].includes(t.category)))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 3);
  if (unknownBig.length && attention.length < 6) {
    attention.push({
      category: "較大額待確認交易", title: `${unknownBig.length} 筆較大額交易的性質未能從摘要判斷`,
      observation: "以下交易的銀行摘要不足以判斷款項性質，系統沒有硬分為營業收入或營運支出。",
      confirm: "請逐項確認這些款項屬客戶付款、供應商付款，還是其他性質。",
      evidence: unknownBig.map(evidenceOf)
    });
  }

  const notFound = [];
  if (!returned.length) notFound.push("文件內未見銀行明確標示的退票或扣款失敗紀錄。");

  const nextSteps = [];
  transfersOut.slice(0, 2).forEach(t => nextSteps.push(`請確認 ${dayLabel(t.date)} 轉出的 ${fmt(-t.amount, cur)} 是否轉往公司另一個戶口。`));
  shareholderIn.slice(0, 2).forEach(t => nextSteps.push(`請確認 ${dayLabel(t.date)} 股東轉入的 ${fmt(t.amount, cur)} 屬注資、借款還是其他款項。`));
  const custIn = txs.filter(t => t.category === "customer_payment" && t.amount > 0);
  if (custIn.length) nextSteps.push(`請確認 ${custIn.length} 筆合共 ${fmt(custIn.reduce((s, t) => s + t.amount, 0), cur)} 的進帳是否全部為客戶付款。`);
  if (low) nextSteps.push(`請回看 ${dayLabel(low.date)} 前後的結餘低位期間，有沒有延後或未能支付的款項。`);
  if (!nextSteps.length) nextSteps.push("請核對交易整理內列為待確認的項目。");

  let summary;
  const closingText = typeof closing === "number" ? fmt(closing, cur) : "未能核實";
  if (typeof opening === "number" && typeof closing === "number") {
    summary = net < 0
      ? `本月此戶口支出比進帳多 ${fmt(-net, cur)}，期末結餘由 ${fmt(opening, cur)} 減至 ${fmt(closing, cur)}。這反映期內戶口資金變化，未能單憑此判斷公司是否虧損。`
      : net > 0
        ? `本月此戶口進帳比支出多 ${fmt(net, cur)}，期末結餘由 ${fmt(opening, cur)} 增至 ${fmt(closing, cur)}。這反映期內戶口資金變化，未能單憑此判斷公司是否盈利。`
        : `本月此戶口進帳與支出相同，期末結餘維持 ${fmt(closing, cur)}。`;
  } else {
    summary = `本月此戶口進帳 ${fmt(totalIn, cur)}，支出 ${fmt(totalOut, cur)}。期初或期末結餘未能從文件核實，收支核對未能完成。`;
  }

  const acctType = acct.account_type ? acct.account_type : "銀行戶口";
  /* 只保留戶口號碼最後 4 位，其他一律不回傳瀏覽器 */
  const digits = String(acct.masked_number || "").replace(/\D/g, "");
  const last4 = digits.length >= 4 ? digits.slice(-4) : "";
  return {
    isFictional: false,
    reportId,
    period: { label: periodLabel(extracted.statement_period.start, extracted.statement_period.end), start: extracted.statement_period.start, end: extracted.statement_period.end, isLatestMonth: isLatestMonth(extracted.statement_period.end) },
    currency: cur,
    account: { bankLabel: [acct.bank_name, acctType].filter(Boolean).join(" "), maskedNumber: last4 ? "•••• " + last4 : "" },
    document: { pagesRead: extracted.pages_readable, pagesTotal: extracted.pages_total, complete, notes: docNotes },
    partial: !complete,
    openingBalance: typeof opening === "number" ? opening : null,
    totalIn: Math.round(totalIn * 100) / 100,
    totalOut: Math.round(totalOut * 100) / 100,
    closingBalance: typeof closing === "number" ? closing : null,
    dailyBalanceComplete: false,
    summary,
    transactions,
    attention,
    notFound,
    nextSteps,
    stats: { transactionCount: transactions.length, confirmCount }
  };
}
