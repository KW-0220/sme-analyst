/* 後端介接存根（原型用）
   正式系統須以真實 API 取代以下函數。狀態頁只按此處回傳的實際處理狀態更新，
   不使用假倒數或假百分比。原型中的計時只為示範狀態轉換。 */
(function () {
  const STAGES = ["checking", "reading", "summarizing", "done"];

  function startAnalysis(fileMeta) {
    const jobId = "job_" + Math.random().toString(36).slice(2, 10);
    try {
      sessionStorage.setItem("sme_job", JSON.stringify({ jobId, fileName: fileMeta.name, fileSize: fileMeta.size, startedAt: Date.now() }));
    } catch (e) { /* 無法使用 sessionStorage 時仍可繼續 */ }
    return Promise.resolve({ jobId });
  }

  function getJob() {
    try { return JSON.parse(sessionStorage.getItem("sme_job") || "null"); } catch (e) { return null; }
  }

  /* 原型：以 URL ?state= 強制顯示某狀態；否則按時間推進示範狀態。 */
  function pollStatus(jobId) {
    const forced = new URLSearchParams(location.search).get("state");
    if (forced) return Promise.resolve({ stage: forced });
    const job = getJob();
    if (!job) return Promise.resolve({ stage: "no_job" });
    const elapsed = (Date.now() - job.startedAt) / 1000;
    const idx = Math.min(STAGES.length - 1, Math.floor(elapsed / 2.5));
    return Promise.resolve({ stage: STAGES[idx] });
  }

  /* 原型：回傳示範數據並標記 isFictional，報告頁會顯示對應標記。
     真實系統回傳真實結果時 isFictional 必須為 false。 */
  function getReport(jobId, opts) {
    const r = JSON.parse(JSON.stringify(window.SME_DEMO_REPORT));
    r.reportId = jobId || "demo";
    r.prototypeNote = true;
    if (opts && opts.partial) {
      r.document = { pagesRead: 3, pagesTotal: 4, complete: false, notes: ["第 4 頁未能讀取，7 月 30 日及之後的交易未包括在內。", "期末結餘未能核實，收支核對未能完成。"] };
      r.partial = true;
    }
    return Promise.resolve(r);
  }

  function deleteReport(jobId) {
    const forced = new URLSearchParams(location.search).get("delete");
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (forced === "fail") reject(new Error("delete_failed"));
        else { try { sessionStorage.removeItem("sme_job"); } catch (e) {} resolve({ ok: true }); }
      }, 1200);
    });
  }

  window.SME_API = { startAnalysis, pollStatus, getReport, deleteReport, getJob };
})();
