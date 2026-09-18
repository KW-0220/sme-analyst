/* 報告繪製：初步結果頁與示範報告頁共用 */
(function () {
  const { esc, fmtHKD, questionCard, track } = window.SME;

  function periodNote(r) {
    if (r.period.isLatestMonth) return "";
    return '<div class="notice notice--info" style="margin-top:14px"><span class="notice__icon" aria-hidden="true">i</span><p>此份月結單的期間為 ' + esc(r.period.label) + '（' + esc(r.period.start) + ' 至 ' + esc(r.period.end) + '）。以下結果只反映該期間，並非現時公司狀況。</p></div>';
  }

  function docNote(r) {
    if (r.document.complete) return '<span class="tag tag--in">已讀取全部 ' + r.document.pagesTotal + ' 頁</span>';
    return '<span class="tag tag--confirm">只讀取 ' + r.document.pagesRead + ' / ' + r.document.pagesTotal + ' 頁</span>';
  }

  function reconciliation(r) {
    const expected = r.openingBalance + r.totalIn - r.totalOut;
    if (!r.document.complete) {
      return '<div class="notice notice--warn" style="margin-top:12px"><span class="notice__icon" aria-hidden="true">!</span><p>文件未完整讀取，期初＋進帳−支出＝期末的核對未能完成。請補回完整版本後重新分析。</p></div>';
    }
    if (expected === r.closingBalance) {
      return '<p class="small muted" style="margin:10px 0 0">核對：期初 ' + fmtHKD(r.openingBalance) + ' ＋ 進帳 ' + fmtHKD(r.totalIn) + ' − 支出 ' + fmtHKD(r.totalOut) + ' ＝ 期末 ' + fmtHKD(r.closingBalance) + '，與文件一致。</p>';
    }
    return '<div class="notice notice--warn" style="margin-top:12px"><span class="notice__icon" aria-hidden="true">!</span><p>核對不一致：期初＋進帳−支出為 ' + fmtHKD(expected) + '，文件期末結餘為 ' + fmtHKD(r.closingBalance) + '。此項需要覆核，以下數字請以文件為準。</p></div>';
  }

  function kpis(r) {
    const net = r.totalIn - r.totalOut;
    const items = [
      ["期初結餘", fmtHKD(r.openingBalance)],
      ["總進帳", fmtHKD(r.totalIn)],
      ["總支出", fmtHKD(r.totalOut)],
      [net >= 0 ? "淨流入" : "淨流出", fmtHKD(Math.abs(net))],
      ["期末結餘", r.document.complete ? fmtHKD(r.closingBalance) : "未能核實"]
    ];
    return '<div class="kpi-row">' + items.map(([l, v]) => '<div class="stat"><div class="stat__label">' + l + '</div><div class="stat__value">' + v + '</div></div>').join("") + "</div>";
  }

  /* 結餘折線：只畫交易日結餘，不補畫每日曲線 */
  function balanceChart(r, containerId) {
    const pts = [{ date: r.period.start, balance: r.openingBalance, label: "期初" }].concat(r.transactions.map(t => ({ date: t.date, balance: t.balance, desc: t.desc })));
    const W = 720, H = 260, padL = 64, padR = 16, padT = 16, padB = 36;
    const minB = Math.min(0, ...pts.map(p => p.balance));
    const maxB = Math.max(...pts.map(p => p.balance));
    const step = niceStep(maxB - minB);
    const yMin = Math.floor(minB / step) * step;
    const yMax = Math.ceil(maxB / step) * step;
    const day = d => new Date(d + "T00:00:00").getTime();
    const t0 = day(r.period.start), t1 = day(r.period.end);
    const x = d => padL + ((day(d) - t0) / (t1 - t0)) * (W - padL - padR);
    const y = v => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
    const low = pts.reduce((a, b) => (b.balance < a.balance ? b : a), pts[0]);
    let grid = "";
    for (let v = yMin; v <= yMax; v += step) {
      grid += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="var(--grid)" stroke-width="1"/>';
      grid += '<text x="' + (padL - 8) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--ink-3)">' + (v / 1000).toLocaleString() + 'k</text>';
    }
    const xt = [1, 8, 15, 22, 29].map(d => r.period.start.slice(0, 8) + String(d).padStart(2, "0")).filter(d => day(d) <= t1);
    const xticks = xt.map(d => '<text x="' + x(d).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="11" fill="var(--ink-3)">' + d.slice(5).replace("-", "/") + '</text>').join("");
    const path = pts.map((p, i) => (i ? "L" : "M") + x(p.date).toFixed(1) + " " + y(p.balance).toFixed(1)).join(" ");
    const dots = pts.map((p, i) => '<circle class="pt" data-i="' + i + '" cx="' + x(p.date).toFixed(1) + '" cy="' + y(p.balance).toFixed(1) + '" r="4" fill="' + (p === low ? "var(--chart-low)" : "var(--chart-line)") + '" stroke="var(--surface)" stroke-width="2"/>').join("");
    const lowLabel = '<text x="' + x(low.date).toFixed(1) + '" y="' + (y(low.balance) + 18).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink)">最低 ' + fmtHKD(low.balance) + '</text>';
    const svg =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="交易日結餘折線圖，最低位 ' + fmtHKD(low.balance) + '，日期 ' + low.date + '">' +
        grid + xticks +
        '<path d="' + path + '" fill="none" stroke="var(--chart-line)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<line class="xhair" x1="0" x2="0" y1="' + padT + '" y2="' + (H - padB) + '" stroke="var(--ink-3)" stroke-width="1" style="display:none"/>' +
        dots + lowLabel +
      "</svg>";
    const el = document.getElementById(containerId);
    el.innerHTML = svg + '<div class="tip" role="status" aria-live="polite"></div>';
    const svgEl = el.querySelector("svg"), tip = el.querySelector(".tip"), xh = el.querySelector(".xhair");
    function show(i, clientX) {
      const p = pts[i];
      const rect = svgEl.getBoundingClientRect();
      const px = x(p.date) / W * rect.width, py = y(p.balance) / H * rect.height;
      tip.innerHTML = "<strong>" + fmtHKD(p.balance) + "</strong>" + esc(p.date) + (p.label ? "（" + p.label + "）" : "");
      tip.style.left = px + "px"; tip.style.top = py + "px"; tip.style.display = "block";
      xh.setAttribute("x1", x(p.date)); xh.setAttribute("x2", x(p.date)); xh.style.display = "block";
    }
    svgEl.addEventListener("pointermove", e => {
      const rect = svgEl.getBoundingClientRect();
      const vx = (e.clientX - rect.left) / rect.width * W;
      let best = 0, bd = Infinity;
      pts.forEach((p, i) => { const d = Math.abs(x(p.date) - vx); if (d < bd) { bd = d; best = i; } });
      show(best);
    });
    svgEl.addEventListener("pointerleave", () => { tip.style.display = "none"; xh.style.display = "none"; });
    return low;
  }
  function niceStep(range) {
    const raw = range / 5, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  }

  function txTable(r) {
    const rows = r.transactions.map(t =>
      "<tr><td>" + esc(t.date) + "</td><td>" + esc(t.desc) + '</td><td class="num">' + (t.amount > 0 ? "+" : "") + fmtHKD(t.amount) + "</td><td>" +
      '<span class="tag ' + (t.confirm ? "tag--confirm" : "") + '">' + esc(t.category) + "</span></td><td class=\"num\">" + fmtHKD(t.balance) + '</td><td class="num">' + t.page + "</td></tr>").join("");
    const list = r.transactions.map(t =>
      '<div class="tx-item"><div class="tx-item__top"><span>' + esc(t.desc) + '</span><span class="tx-item__amt">' + (t.amount > 0 ? "+" : "") + fmtHKD(t.amount) + "</span></div>" +
      '<div class="tx-item__meta"><span>' + esc(t.date) + '</span><span class="tag ' + (t.confirm ? "tag--confirm" : "") + '">' + esc(t.category) + "</span><span>結餘 " + fmtHKD(t.balance) + "</span><span>第 " + t.page + " 頁</span></div></div>").join("");
    return '<div class="table-wrap tx-table"><table><thead><tr><th>日期</th><th>摘要</th><th class="num">金額</th><th>初步分類</th><th class="num">結餘</th><th class="num">頁碼</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="tx-list">' + list + "</div>";
  }

  function render(r, opts) {
    opts = opts || {};
    const kind = opts.reportKind || "prelim";
    const root = document.getElementById("report-root");
    const net = r.totalIn - r.totalOut;
    const confirmCount = r.transactions.filter(t => t.confirm).length;

    root.innerHTML =
      '<section class="report-section" id="overview">' +
        '<div class="report-head"><div>' +
          '<span class="eyebrow">月結單初步分析</span>' +
          "<h1>" + esc(r.period.label) + " 現金流初步摘要</h1>" +
          '<dl class="report-meta">' +
            "<div><dt>分析月份</dt><dd>" + esc(r.period.label) + "</dd></div>" +
            "<div><dt>幣種</dt><dd>" + esc(r.currency) + "</dd></div>" +
            "<div><dt>戶口</dt><dd>" + esc(r.account.bankLabel) + " " + esc(r.account.maskedNumber) + "</dd></div>" +
            "<div><dt>文件完整性</dt><dd>" + docNote(r) + "</dd></div>" +
          "</dl>" +
          periodNote(r) +
          (r.document.notes.length ? '<div class="notice notice--warn" style="margin-top:12px"><span class="notice__icon" aria-hidden="true">!</span><div><p><strong>以下資料未能讀取：</strong></p><ul style="margin:6px 0 0">' + r.document.notes.map(n => "<li>" + esc(n) + "</li>").join("") + "</ul><p style=\"margin-top:6px\">以下只顯示可核實項目。請補回完整版本後重新分析。</p></div></div>" : "") +
        "</div>" +
        (opts.actions ? '<div class="report-actions no-print">' + opts.actions + "</div>" : "") +
        "</div>" +
      "</section>" +

      '<section class="report-section" id="summary"><h2>一句摘要</h2><div class="summary-line"><p>' + esc(r.summary) + "</p></div>" +
        (r.attention.length > 4 ? '<p class="small" style="margin-top:12px"><a href="#next">想再睇清楚公司整體財務狀況？前往官網完整分析的說明</a></p>' : "") +
      "</section>" +

      '<section class="report-section" id="cashflow"><h2>戶口收支</h2>' + kpis(r) + reconciliation(r) +
        '<p class="small muted" style="margin-top:10px">進帳與支出為銀行戶口的資金進出，並非營業額或盈利。</p>' +
      "</section>" +

      '<section class="report-section" id="balance"><h2>結餘變化</h2>' +
        '<div class="chart-card"><div class="chart-card__title">交易日結餘</div><div class="chart-card__sub">只顯示有交易的日子；沒有補畫每日曲線。</div>' +
        '<div class="chart" id="balance-chart"></div>' +
        '<div class="chart-foot" id="balance-foot"></div></div>' +
      "</section>" +

      '<section class="report-section" id="transactions"><h2>交易整理</h2>' +
        '<p class="ink2">共 ' + r.transactions.length + ' 筆交易，其中 ' + confirmCount + ' 筆列為待確認。初步分類由 AI 按摘要推斷，並非已確認事實；摘要不足以分類的交易不會硬分為營業收入。</p>' +
        txTable(r) +
      "</section>" +

      '<section class="report-section" id="attention"><h2>留意事項</h2>' +
        '<p class="ink2">以下只描述文件可支持的觀察。待確認事項並非已確定的財務問題。每項均可按「搵顧問」查詢。</p>' +
        '<div class="qcards">' + r.attention.map(q => questionCard(q, kind)).join("") + "</div>" +
        (r.notFound && r.notFound.length ? '<div class="notice" style="margin-top:14px"><span class="notice__icon" aria-hidden="true" style="background:var(--surface-3)">–</span><div>' + r.notFound.map(n => "<p>" + esc(n) + "</p>").join("") + "</div></div>" : "") +
      "</section>" +

      '<section class="report-section" id="next-steps"><h2>下一步</h2>' +
        '<p class="ink2">以下是根據本月觀察提出、可以自行核對的問題。系統不會由單月結單推算任何可獲批額度。</p>' +
        "<ol>" + r.nextSteps.map(s => "<li>" + esc(s) + "</li>").join("") + "</ol>" +
      "</section>" +

      (kind === "prelim" ?
      '<section class="report-section" id="next"><div class="next-block">' +
        "<h2>想再睇清楚公司整體財務狀況？</h2>" +
        "<p>今次分析只涵蓋你上載的一份公司月結單。如果你想了解更多，可以前往 SME Clinic 官網，上載完整財務報告及所需文件，進行更全面的分析。</p>" +
        '<div class="btn-row"><a class="btn btn--primary" data-href="full-analysis" href="' + esc(window.SME_CONFIG.fullAnalysisUrl) + '" target="_blank" rel="noopener" data-track="go_full_analysis_click">前往官網，做完整分析</a>' +
        '<a class="btn btn--ghost" href="full-analysis-intake.html">官網會要求甚麼文件？</a></div>' +
        '<p class="small muted" style="margin:12px 0 0">你可以自行決定是否繼續；初步報告仍可獨立查看。按「前往官網」不代表授權轉移文件。</p>' +
      "</div></section>" : "") +

      '<section class="report-section" id="advisor"><div class="advisor-block">' +
        "<h2>想搵人同你睇份報告？</h2>" +
        "<p class=\"ink2\">你可以先查詢，再決定是否讓顧問查看本次報告。</p>" +
        '<button type="button" class="btn btn--primary" data-advisor-general="' + kind + '">搵顧問</button>' +
        (opts.showAuthorizeLink ? '<p class="small muted" style="margin:12px 0 0">如你希望顧問查看本次報告，須另行<a href="authorize.html">授權分享內容</a>，預設不會分享。</p>' : "") +
      "</div></section>";

    const low = balanceChart(r, "balance-chart");
    document.getElementById("balance-foot").innerHTML =
      "<span>最低位：<strong>" + fmtHKD(low.balance) + "</strong>（" + esc(low.date) + "）</span>" +
      "<span>每日平均結餘：" + (r.dailyBalanceComplete ? "已計算" : "無法計算（文件未能完整重建每日日終結餘）") + "</span>";
    track("report_view", { report: kind, fictional: !!r.isFictional });
  }

  window.SME_REPORT = { render };
})();
