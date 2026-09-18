/* 前端與後端介接
   - 檔案在瀏覽器以 IndexedDB 暫存，交給分析狀態頁上載。
   - 分析結果只保存在本次瀏覽器工作階段（sessionStorage），伺服器不保留文件或報告。 */
(function () {
  const DB = "sme-analyst", STORE = "pending";

  function idb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbPut(key, value) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
  }
  async function idbGet(key) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
  }
  async function idbDel(key) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
  }

  function getJob() {
    try { return JSON.parse(sessionStorage.getItem("sme_job") || "null"); } catch (e) { return null; }
  }
  function setJob(job) {
    try { sessionStorage.setItem("sme_job", JSON.stringify(job)); } catch (e) {}
  }

  /* 首頁：記錄檔案，交給分析頁 */
  async function startAnalysis(file) {
    const jobId = "job_" + Math.random().toString(36).slice(2, 10);
    await idbPut(jobId, file);
    setJob({ jobId, fileName: file.name, fileSize: file.size, startedAt: Date.now() });
    return { jobId };
  }

  async function getPendingFile(jobId) { return idbGet(jobId); }

  /* 分析頁：上載並等待結果。回傳 { ok, report } 或 { ok:false, code, message } */
  async function analyze(jobId) {
    const file = await idbGet(jobId);
    if (!file) return { ok: false, code: "no_file", message: "找不到待分析的文件，請重新上載。" };
    let res;
    try {
      res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file });
    } catch (e) {
      return { ok: false, code: "network", message: "未能連接分析服務，請檢查網絡後重試。" };
    }
    let data;
    try { data = await res.json(); }
    catch (e) { return { ok: false, code: "bad_response", message: "分析服務回應異常（HTTP " + res.status + "），請稍後重試。" }; }
    if (data.ok && data.report) {
      try { sessionStorage.setItem("sme_report_" + jobId, JSON.stringify(data.report)); } catch (e) {}
      await idbDel(jobId);
    }
    return data;
  }

  function getReport(jobId) {
    try { return JSON.parse(sessionStorage.getItem("sme_report_" + jobId) || "null"); } catch (e) { return null; }
  }

  /* 刪除：伺服器不保留資料，這裏清除瀏覽器內的文件與報告 */
  async function deleteReport(jobId) {
    try { sessionStorage.removeItem("sme_report_" + jobId); sessionStorage.removeItem("sme_job"); } catch (e) {}
    try { await idbDel(jobId); } catch (e) {}
    return { ok: true };
  }

  window.SME_API = { startAnalysis, analyze, getReport, deleteReport, getJob, setJob, getPendingFile };
})();
