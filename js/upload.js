/* 上載區狀態：尚未選檔 → 選檔完成 / 格式不支援 / 檔案過大 / 文件已加密 → 同意後開始 */
(function () {
  const C = window.SME_CONFIG, { esc, fmtSize, track, toast } = window.SME;
  const dz = document.getElementById("dropzone");
  const input = document.getElementById("file-input");
  const status = document.getElementById("file-status");
  const consent = document.getElementById("consent");
  const submit = document.getElementById("submit-btn");
  const form = document.getElementById("upload-form");
  const maxBytes = C.upload.maxSizeMB * 1024 * 1024;
  let file = null;
  let fileValid = false;

  /* 處理者說明：外部服務清單（待核實時顯示標記） */
  const procEl = document.getElementById("processors-home");
  if (procEl) {
    procEl.innerHTML = Array.isArray(C.processing.processors) && C.processing.processors.length
      ? C.processing.processors.map(esc).join("、")
      : window.SME.pendingOr(null, "實際使用的外部 AI／雲端處理服務");
  }

  function notice(type, icon, html) {
    return '<div class="notice notice--' + type + '"><span class="notice__icon" aria-hidden="true">' + icon + '</span><div>' + html + "</div></div>";
  }

  function renderEmpty() {
    status.innerHTML = '<p class="small muted" style="margin:0">請選擇一份完整月結單 PDF。</p>';
    dz.classList.remove("hidden");
    update();
  }

  function renderSelected() {
    status.innerHTML =
      '<div class="file-row">' +
        '<div class="file-row__icon" aria-hidden="true">PDF</div>' +
        '<div class="file-row__meta"><div class="file-row__name">' + esc(file.name) + '</div><div class="file-row__size">' + fmtSize(file.size) + "</div></div>" +
        '<div class="file-row__actions"><button type="button" class="btn btn--secondary btn--sm" id="replace-btn">更換檔案</button><button type="button" class="btn btn--ghost btn--sm" id="remove-btn">移除</button></div>' +
      "</div>";
    dz.classList.add("hidden");
    document.getElementById("replace-btn").addEventListener("click", () => input.click());
    document.getElementById("remove-btn").addEventListener("click", clear);
    update();
  }

  function renderError(msg, actionLabel) {
    status.innerHTML = notice("err", "!", "<p>" + esc(msg) + '</p><div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn--secondary btn--sm" id="retry-btn">' + esc(actionLabel) + "</button></div>");
    dz.classList.remove("hidden");
    document.getElementById("retry-btn").addEventListener("click", () => input.click());
    update();
  }

  function clear() {
    file = null; fileValid = false; input.value = "";
    renderEmpty();
  }

  function update() {
    submit.disabled = !(fileValid && consent.checked);
  }

  /* 讀取檔頭及尾段，檢查 PDF 簽名及是否加密（/Encrypt）。此為前端初步檢查，伺服器須再次驗證。 */
  function inspectPdf(f) {
    return new Promise(resolve => {
      const head = f.slice(0, 8);
      const tail = f.slice(Math.max(0, f.size - 4096), f.size);
      const r1 = new FileReader();
      r1.onload = () => {
        const isPdf = String(r1.result || "").indexOf("%PDF") === 0;
        const r2 = new FileReader();
        r2.onload = () => resolve({ isPdf, encrypted: String(r2.result || "").indexOf("/Encrypt") > -1 });
        r2.onerror = () => resolve({ isPdf, encrypted: false });
        r2.readAsText(tail, "latin1");
      };
      r1.onerror = () => resolve({ isPdf: false, encrypted: false });
      r1.readAsText(head, "latin1");
    });
  }

  async function handle(f) {
    if (!f) return;
    file = f; fileValid = false;
    track("file_selected");
    const extOk = /\.pdf$/i.test(f.name) || f.type === "application/pdf";
    if (!extOk) { renderError("請上載 PDF 格式的公司銀行月結單。", "重新選擇"); return; }
    if (f.size > maxBytes) { renderError("檔案超過系統上限 " + C.upload.maxSizeMB + " MB。請換用較小的完整 PDF，不要刪去交易頁。", "更換檔案"); return; }
    const info = await inspectPdf(f);
    if (!info.isPdf) { renderError("請上載 PDF 格式的公司銀行月結單。", "重新選擇"); return; }
    if (info.encrypted) { renderError("此 PDF 已加密，請使用你有權開啟的未加密副本。系統不會收集網上銀行密碼。", "更換檔案"); return; }
    fileValid = true;
    renderSelected();
  }

  input.addEventListener("change", () => handle(input.files[0]));
  dz.addEventListener("click", () => input.click());
  dz.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("is-drag"); }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("is-drag"); }));
  dz.addEventListener("drop", e => {
    const files = e.dataTransfer.files;
    if (files.length > 1) { toast("一次只可上載一份 PDF。已選取第一份。"); }
    handle(files[0]);
  });
  consent.addEventListener("change", update);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!fileValid) { toast("請先選擇一份月結單 PDF。"); return; }
    if (!consent.checked) { toast("請先閱讀並勾選同意。"); consent.focus(); return; }
    submit.disabled = true;
    submit.textContent = "正在傳送文件…";
    try {
      const { jobId } = await window.SME_API.startAnalysis(file);
      track("upload_success");
      location.href = "analysis.html?job=" + encodeURIComponent(jobId);
    } catch (err) {
      submit.disabled = false; submit.textContent = "開始初步分析";
      status.insertAdjacentHTML("beforeend", notice("err", "!", "<p>今次未能暫存文件（瀏覽器可能封鎖了儲存空間），請重試或改用其他瀏覽器。</p>"));
    }
  });

  renderEmpty();
})();
