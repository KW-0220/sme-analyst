/* 分析狀態頁：檢查文件 → 讀取交易 → 整理摘要；含失敗、缺頁、部分可讀及完成狀態。
   所有狀態以文字加圖示表達，不單靠顏色；不顯示假倒數或假百分比。 */
(function () {
  const { esc, fmtSize, track } = window.SME;
  const card = document.getElementById("status-card");
  const params = new URLSearchParams(location.search);
  const jobId = params.get("job") || "";
  const job = window.SME_API.getJob();
  const STEPS = [
    { key: "checking", label: "檢查文件" },
    { key: "reading", label: "讀取交易" },
    { key: "summarizing", label: "整理摘要" }
  ];
  let timer = null;

  function fileLine() {
    if (!job) return "";
    return '<p class="file-meta-line">文件：' + esc(job.fileName) + "（" + fmtSize(job.fileSize) + "）</p>";
  }

  function stepsHtml(current, errorAt) {
    const idx = STEPS.findIndex(s => s.key === current);
    return '<ul class="steps">' + STEPS.map((s, i) => {
      let cls = "", icon = String(i + 1), state = "等待中";
      if (errorAt === s.key) { cls = "step--error"; icon = "!"; state = "未能完成"; }
      else if (i < idx || current === "done") { cls = "step--done"; icon = "✓"; state = "完成"; }
      else if (i === idx) { cls = "step--active"; icon = '<span class="spinner" aria-hidden="true"></span>'; state = "進行中"; }
      return '<li class="' + cls + '"><span class="step__icon" aria-hidden="true">' + icon + '</span><span class="step__label">' + s.label + '</span><span class="step__state">' + state + "</span></li>";
    }).join("") + "</ul>";
  }

  const linkReport = "report.html?job=" + encodeURIComponent(jobId);

  const VIEWS = {
    checking: () => '<span class="eyebrow">分析進行中</span><h1 style="font-size:1.5rem">正在檢查文件</h1>' + fileLine() + stepsHtml("checking") + '<p class="small muted">正在確認頁數、期間及可讀性。</p>',
    reading: () => '<span class="eyebrow">分析進行中</span><h1 style="font-size:1.5rem">正在讀取交易</h1>' + fileLine() + stepsHtml("reading") + '<p class="small muted">正在抽取交易日期、摘要、金額及結餘。</p>',
    summarizing: () => '<span class="eyebrow">分析進行中</span><h1 style="font-size:1.5rem">正在整理摘要</h1>' + fileLine() + stepsHtml("summarizing") + '<p class="small muted">正在計算收支、核對期初與期末結餘，並整理需要確認的交易。</p>',
    done: () => '<span class="eyebrow">完成</span><h1 style="font-size:1.5rem">你的現金流初步摘要已準備好</h1>' + fileLine() + stepsHtml("done") +
      '<div class="btn-row"><a class="btn btn--primary" href="' + linkReport + '" data-track="analysis_complete_view">閱讀初步摘要</a></div>' +
      '<p class="small muted" style="margin-top:12px">毋須留下電話或上載更多文件，即可閱讀及下載全部初步結果。</p>',
    failed: () => '<span class="eyebrow">未能完成</span><h1 style="font-size:1.5rem">今次未能完成分析</h1>' + fileLine() + stepsHtml("reading", "reading") +
      '<div class="notice notice--err"><span class="notice__icon" aria-hidden="true">!</span><p>今次未能完成分析，請重試或更換文件。原始文件不會因此被保留更長時間。</p></div>' +
      '<div class="btn-row" style="margin-top:16px"><button type="button" class="btn btn--primary" id="retry-btn">重試</button><a class="btn btn--secondary" href="index.html#upload">返回上載區</a><a class="btn btn--ghost" href="about.html#contact">聯絡支援</a></div>',
    unreadable: () => '<span class="eyebrow">需要處理</span><h1 style="font-size:1.5rem">未能完整讀取月結單</h1>' + fileLine() + stepsHtml("checking", "checking") +
      '<div class="notice notice--warn"><span class="notice__icon" aria-hidden="true">!</span><p>未能完整讀取月結單，請重新上載全部頁面的清晰版本。請保留交易日期、摘要、金額，以及期初和期末結餘。</p></div>' +
      '<div class="btn-row" style="margin-top:16px"><a class="btn btn--primary" href="index.html#upload">重新上載</a><a class="btn btn--ghost" href="about.html#contact">聯絡支援</a></div>',
    partial: () => '<span class="eyebrow">部分可讀</span><h1 style="font-size:1.5rem">只有部分內容可以核實</h1>' + fileLine() + stepsHtml("done") +
      '<div class="notice notice--warn"><span class="notice__icon" aria-hidden="true">!</span><div><p>以下資料未能讀取：</p><ul style="margin:6px 0 0"><li>第 4 頁未能讀取，7 月 30 日及之後的交易未包括在內。</li><li>期末結餘未能核實。</li></ul><p style="margin-top:6px">報告只會顯示可核實項目，不會輸出整體評分。</p></div></div>' +
      '<div class="btn-row" style="margin-top:16px"><a class="btn btn--primary" href="index.html#upload">補回完整版本</a><a class="btn btn--secondary" href="' + linkReport + '&partial=1">先閱讀可核實部分</a></div>',
    no_job: () => '<h1 style="font-size:1.5rem">找不到分析工作</h1><p class="ink2">此頁沒有對應的上載紀錄。請返回首頁重新上載月結單。</p><div class="btn-row"><a class="btn btn--primary" href="index.html#upload">返回上載區</a></div>'
  };

  function render(stage) {
    const view = VIEWS[stage] || VIEWS.no_job;
    card.innerHTML = view();
    const retry = document.getElementById("retry-btn");
    if (retry) retry.addEventListener("click", () => {
      try { const j = window.SME_API.getJob(); if (j) { j.startedAt = Date.now(); sessionStorage.setItem("sme_job", JSON.stringify(j)); } } catch (e) {}
      history.replaceState(null, "", location.pathname + "?job=" + encodeURIComponent(jobId));
      poll();
    });
    if (stage === "done") track("analysis_complete");
    if (stage === "failed" || stage === "unreadable") track("analysis_failed", { reason: stage });
    if (stage === "partial") track("analysis_partial");
  }

  async function poll() {
    clearTimeout(timer);
    const s = await window.SME_API.pollStatus(jobId);
    render(s.stage);
    if (["checking", "reading", "summarizing"].indexOf(s.stage) > -1 && !params.get("state")) {
      timer = setTimeout(poll, 1500);
    }
  }
  poll();
})();
