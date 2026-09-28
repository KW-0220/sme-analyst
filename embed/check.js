/* SME Clinic 免費月結單檢查：可嵌入元件
   用法（放在任何 *.sme-clinic-ai.com 頁面）：
     <div id="sme-check"></div>
     <script src="https://analyst.sme-clinic-ai.com/embed/check.js" defer
             data-target="#sme-check" data-theme="light" data-vertical="網店"
             data-whatsapp="85298058577" data-full-url="https://www.sme-clinic-ai.com" data-full-label="做完整分析"></script>
   屬性全部可省略：theme 預設 light；vertical 用於文案（例如「網店」「工程公司」）；
   full-url 省略時不顯示完整分析按鈕。分析由此檔案所在的網域（analyst）後端執行，頁面本身不需要 API key。 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var ds = script.dataset || {};
  var ORIGIN = new URL(script.src, location.href).origin;
  var API = ORIGIN + "/api/analyze";
  var WA = ds.whatsapp || "85298058577";
  var THEME = ds.theme === "dark" ? "dark" : "light";
  var VERT = ds.vertical || "公司";
  var FULL_URL = ds.fullUrl || "";
  var FULL_LABEL = ds.fullLabel || "做完整分析";
  var MAX_MB = 4;

  var CSS = '\
.smeck{--sc-bg:#ffffff;--sc-panel:#f5f7f9;--sc-panel2:#ffffff;--sc-text:#1f2a44;--sc-hi:#13294b;--sc-muted:#6b7280;--sc-border:#e3e7ec;--sc-accent:#119aa3;--sc-accent-ink:#ffffff;--sc-err-bg:#fde8e6;--sc-err-bd:#f3b8b3;--sc-err-tx:#7a1f17;--sc-warn-bg:#fff4d6;--sc-warn-bd:#f1dca0;--sc-warn-tx:#5a3b00;font-family:-apple-system,BlinkMacSystemFont,"PingFang HK","Noto Sans HK","Noto Sans TC","Microsoft JhengHei",Segoe UI,sans-serif;font-size:16px;line-height:1.65;color:var(--sc-text);max-width:860px;margin:0 auto;box-sizing:border-box}\
.smeck.dark{--sc-bg:transparent;--sc-panel:#10233d;--sc-panel2:rgba(255,255,255,.04);--sc-text:#c9d6e8;--sc-hi:#ffffff;--sc-muted:#8ca3c0;--sc-border:rgba(255,255,255,.12);--sc-accent:#35decb;--sc-accent-ink:#06222e;--sc-err-bg:rgba(255,120,120,.12);--sc-err-bd:rgba(255,120,120,.35);--sc-err-tx:#ffd6d6;--sc-warn-bg:rgba(255,200,80,.12);--sc-warn-bd:rgba(255,200,80,.35);--sc-warn-tx:#ffe9b8}\
.smeck *{box-sizing:border-box}.smeck h2{color:var(--sc-hi);font-size:clamp(1.4rem,3vw,1.9rem);line-height:1.3;margin:0 0 12px;text-align:center}.smeck .sc-intro{color:var(--sc-text);margin:0 auto 24px;text-align:center;max-width:720px}\
.smeck .sc-panel{background:var(--sc-panel);border:1px solid var(--sc-border);border-radius:16px;padding:24px;margin-top:16px}\
.smeck .sc-drop{border:2px dashed var(--sc-border);border-radius:12px;padding:28px 18px;text-align:center;cursor:pointer;background:var(--sc-panel2)}.smeck .sc-drop:hover,.smeck .sc-drop.is-drag{border-color:var(--sc-accent)}\
.smeck .sc-drop-main{font-weight:700;color:var(--sc-hi);font-size:1.05rem;margin-bottom:6px}.smeck .sc-help{color:var(--sc-muted);font-size:.9rem;margin:0}\
.smeck .sc-file{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding:12px 14px;border:1px solid var(--sc-border);border-radius:12px;background:var(--sc-panel2)}.smeck .sc-file .nm{flex:1 1 200px;min-width:0;color:var(--sc-hi);font-weight:600;overflow-wrap:anywhere}.smeck .sc-file .sz{color:var(--sc-muted);font-size:.9rem}\
.smeck button,.smeck .sc-btn{font:inherit;cursor:pointer}.smeck .sc-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 20px;border-radius:10px;font-weight:700;text-decoration:none;border:1px solid var(--sc-border);color:var(--sc-hi);background:var(--sc-panel2)}\
.smeck .sc-btn.pri{background:var(--sc-accent);color:var(--sc-accent-ink);border-color:var(--sc-accent)}.smeck .sc-btn[disabled]{opacity:.45;cursor:not-allowed}.smeck .sc-btn.sm{min-height:40px;padding:8px 14px;font-size:.92rem;font-weight:600}\
.smeck .sc-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}\
.smeck .sc-err{margin-top:14px;padding:12px 14px;border-radius:10px;background:var(--sc-err-bg);border:1px solid var(--sc-err-bd);color:var(--sc-err-tx);font-size:.95rem}.smeck .sc-warn{margin-top:14px;padding:12px 14px;border-radius:10px;background:var(--sc-warn-bg);border:1px solid var(--sc-warn-bd);color:var(--sc-warn-tx);font-size:.95rem}\
.smeck .sc-consent{display:flex;gap:12px;align-items:flex-start;margin-top:18px;font-size:.95rem;cursor:pointer}.smeck .sc-consent input{width:22px;height:22px;margin:2px 0 0;flex:none;accent-color:var(--sc-accent)}.smeck a{color:var(--sc-accent)}\
.smeck .sc-fine,.smeck .sc-note{color:var(--sc-muted);font-size:.86rem;line-height:1.6;margin:14px 0 0}\
.smeck .sc-steps{list-style:none;padding:0;margin:12px 0 0}.smeck .sc-steps li{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--sc-border)}.smeck .sc-steps li:last-child{border-bottom:0}\
.smeck .sc-steps .ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:.8rem;font-weight:700;background:var(--sc-border);color:var(--sc-muted);flex:none}.smeck .sc-steps .done .ic{background:var(--sc-accent);color:var(--sc-accent-ink)}.smeck .sc-steps .active .ic{background:#1d4ed8;color:#fff}.smeck .sc-steps .error .ic{background:#b42318;color:#fff}.smeck .sc-steps .st{margin-left:auto;color:var(--sc-muted);font-size:.88rem}\
.smeck .sc-spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:scspin .9s linear infinite}@keyframes scspin{to{transform:rotate(360deg)}}\
.smeck h3{color:var(--sc-hi);font-size:1.15rem;margin:0 0 8px}.smeck h4{color:var(--sc-hi);font-size:1.05rem;margin:0 0 8px}\
.smeck .sc-meta{display:flex;flex-wrap:wrap;gap:6px 18px;color:var(--sc-muted);font-size:.9rem;margin-bottom:12px}.smeck .sc-meta b{color:var(--sc-text);font-weight:600}\
.smeck .sc-summary{color:var(--sc-hi);font-size:1.05rem;line-height:1.7;border-left:3px solid var(--sc-accent);padding-left:14px;margin:0}\
.smeck .sc-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:16px}.smeck .sc-kpi{background:var(--sc-panel2);border:1px solid var(--sc-border);border-radius:10px;padding:10px 12px}.smeck .sc-kpi .l{color:var(--sc-muted);font-size:.8rem}.smeck .sc-kpi .v{color:var(--sc-hi);font-weight:700;font-size:1.05rem;overflow-wrap:anywhere}\
.smeck .sc-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.smeck .sc-tabs button{font-size:.92rem;padding:8px 14px;min-height:40px;border-radius:999px;border:1px solid var(--sc-border);background:transparent;color:var(--sc-text)}.smeck .sc-tabs button[aria-selected="true"]{background:var(--sc-accent);color:var(--sc-accent-ink);border-color:var(--sc-accent);font-weight:700}\
.smeck .sc-q{border-top:1px solid var(--sc-border);padding:16px 0}.smeck .sc-q:first-of-type{border-top:0;padding-top:4px}.smeck .sc-q .lb{color:var(--sc-muted);font-size:.8rem;font-weight:600;margin:8px 0 2px}.smeck .sc-q p{margin:0}\
.smeck .sc-ev{list-style:none;padding:0;margin:4px 0 0;font-size:.9rem}.smeck .sc-ev li{display:flex;flex-wrap:wrap;gap:4px 12px;padding:6px 10px;background:var(--sc-panel2);border:1px solid var(--sc-border);border-radius:8px;margin-top:6px}.smeck .sc-ev .amt{font-weight:700;color:var(--sc-hi);font-variant-numeric:tabular-nums}.smeck .sc-ev .pg{color:var(--sc-muted)}\
.smeck .sc-next ol{margin:8px 0 0;padding-left:1.3em;line-height:1.7}\
@media(max-width:720px){.smeck .sc-kpis{grid-template-columns:1fr 1fr}.smeck .sc-kpis .sc-kpi:last-child{grid-column:span 2}.smeck .sc-panel{padding:18px 16px}.smeck .sc-row .sc-btn{width:100%}}\
.smeck .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}';

  function esc(t) { return String(t).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  function size(b) { return b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB"; }
  function money(n, cur) { if (typeof n !== "number" || isNaN(n)) return "未能核實"; var p = cur === "HKD" ? "HK$" : (cur || "") + " "; return (n < 0 ? "−" : "") + p + Math.abs(Math.round(n)).toLocaleString("en-HK"); }
  function wa(text) { return "https://wa.me/" + WA + "?text=" + encodeURIComponent(text); }
  function track(name) { try { if (window.fbq) fbq("trackCustom", name); if (window.dataLayer) dataLayer.push({ event: name }); } catch (e) {} }

  function mount() {
    var target = ds.target ? document.querySelector(ds.target) : null;
    if (!target) { target = document.createElement("div"); script.parentNode.insertBefore(target, script); }
    var style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    var root = document.createElement("div"); root.className = "smeck " + THEME; target.appendChild(root);
    root.innerHTML =
      '<h2>免費檢查：上載 1 個月月結單，睇吓銀行會問咩</h2>' +
      '<p class="sc-intro">唔使先交齊六個月文件。揀一份最近一個月嘅' + esc(VERT) + '銀行月結單，AI 幫你整理進出帳、結餘低位，同銀行審批時最常追問嘅交易，逐項有日期同頁碼依據。唔使留電話，唔使開戶，結果即時喺呢頁顯示。</p>' +
      '<form class="sc-panel sc-form" novalidate>' +
        '<div class="sc-drop" tabindex="0" role="button"><div class="sc-drop-main">拖放月結單 PDF 到這裏，或按一下選擇檔案</div><p class="sc-help">一次一份 PDF，可多頁，' + MAX_MB + ' MB 以內。請保留交易日期、摘要、金額，以及期初和期末結餘。綜合戶口結單亦可，會逐個戶口分開顯示。</p><input type="file" class="sr" accept="application/pdf,.pdf" aria-label="選擇月結單 PDF"></div>' +
        '<div class="sc-file-status" aria-live="polite"></div>' +
        '<label class="sc-consent"><input type="checkbox" class="sc-consent-box"><span>我確認有權提交此文件，並已閱讀 <a href="' + ORIGIN + '/privacy.html" target="_blank" rel="noopener">私隱政策及文件使用說明</a>，同意按所述方式處理文件以產生本次檢查。</span></label>' +
        '<div class="sc-row"><button type="submit" class="sc-btn pri" disabled>開始免費檢查</button><a class="sc-btn" href="' + ORIGIN + '/demo-report.html" target="_blank" rel="noopener">先睇示範報告</a></div>' +
        '<p class="sc-fine">文件只喺分析請求期間存在於伺服器記憶體，唔會保留；結果只喺你呢個瀏覽器分頁顯示，離開後即消失。分析以文件內可辨識資料為準，如有缺頁或內容不清晰，會提示你處理。</p>' +
      '</form>' +
      '<div class="sc-panel sc-status" aria-live="polite" hidden></div>' +
      '<div class="sc-result" hidden></div>';

    var q = function (s) { return root.querySelector(s); };
    var form = q(".sc-form"), drop = q(".sc-drop"), input = q("input[type=file]"), fileStatus = q(".sc-file-status"), consent = q(".sc-consent-box"), submit = q("button[type=submit]"), status = q(".sc-status"), result = q(".sc-result");
    var file = null, valid = false, reports = [], current = 0;

    function update() { submit.disabled = !(valid && consent.checked); }
    function renderEmpty() { fileStatus.innerHTML = ""; drop.hidden = false; update(); }
    function renderSelected() {
      fileStatus.innerHTML = '<div class="sc-file"><span class="nm">' + esc(file.name) + '</span><span class="sz">' + size(file.size) + '</span><button type="button" class="sc-btn sm sc-replace">更換檔案</button><button type="button" class="sc-btn sm sc-remove">移除</button></div>';
      drop.hidden = true;
      q(".sc-replace").addEventListener("click", function () { input.click(); });
      q(".sc-remove").addEventListener("click", clear);
      update();
    }
    function renderErr(msg) { fileStatus.innerHTML = '<div class="sc-err">' + esc(msg) + "</div>"; drop.hidden = false; valid = false; update(); }
    function clear() { file = null; valid = false; input.value = ""; renderEmpty(); }
    function inspect(f) {
      return new Promise(function (resolve) {
        var r1 = new FileReader();
        r1.onload = function () {
          var isPdf = String(r1.result || "").indexOf("%PDF") === 0;
          var r2 = new FileReader();
          r2.onload = function () { resolve({ isPdf: isPdf, encrypted: String(r2.result || "").indexOf("/Encrypt") > -1 }); };
          r2.onerror = function () { resolve({ isPdf: isPdf, encrypted: false }); };
          r2.readAsText(f.slice(Math.max(0, f.size - 65536), f.size), "latin1");
        };
        r1.onerror = function () { resolve({ isPdf: false, encrypted: false }); };
        r1.readAsText(f.slice(0, 8), "latin1");
      });
    }
    function handle(f) {
      if (!f) return;
      file = f; valid = false; track("FreeCheckFileSelected");
      if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return renderErr("請上載 PDF 格式的公司銀行月結單。");
      if (f.size > MAX_MB * 1048576) return renderErr("檔案超過上限 " + MAX_MB + " MB。請換用較小的完整 PDF，不要刪去交易頁。");
      inspect(f).then(function (info) {
        if (!info.isPdf) return renderErr("請上載 PDF 格式的公司銀行月結單。");
        if (info.encrypted) return renderErr("此 PDF 已加密，請使用你有權開啟的未加密副本。系統不會收集網上銀行密碼。");
        valid = true; renderSelected();
      });
    }
    input.addEventListener("change", function () { handle(input.files[0]); });
    drop.addEventListener("click", function () { input.click(); });
    drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-drag"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-drag"); }); });
    drop.addEventListener("drop", function (e) { handle(e.dataTransfer.files[0]); });
    consent.addEventListener("change", update);

    var STEPS = [["檢查文件", "正在確認檔案格式、大小及是否加密。"], ["讀取交易", "正在把文件交給 AI 讀取每筆交易，數頁的月結單一般需要十多秒至一分鐘，請保持此頁開啟。"], ["整理問題", "正在計算收支、核對結餘，並整理銀行可能會問的事項。"]];
    function showStatus(idx, errorAt, msg) {
      status.hidden = false; result.hidden = true;
      status.innerHTML = "<h3>" + (errorAt != null ? "今次未能完成檢查" : (idx >= STEPS.length ? "檢查完成" : "正在" + STEPS[idx][0])) + "</h3>" +
        (file ? '<div class="sc-meta"><span>文件：<b>' + esc(file.name) + "</b>（" + size(file.size) + "）</span></div>" : "") +
        '<ul class="sc-steps">' + STEPS.map(function (s, i) {
          var cls = "", ic = String(i + 1), st = "等待中";
          if (errorAt === i) { cls = "error"; ic = "!"; st = "未能完成"; }
          else if (i < idx) { cls = "done"; ic = "✓"; st = "完成"; }
          else if (i === idx) { cls = "active"; ic = '<span class="sc-spin" aria-hidden="true"></span>'; st = "進行中"; }
          return '<li class="' + cls + '"><span class="ic" aria-hidden="true">' + ic + "</span><span>" + s[0] + '</span><span class="st">' + st + "</span></li>";
        }).join("") + "</ul>" +
        (errorAt != null ? '<div class="sc-err">' + esc(msg) + '</div><div class="sc-row"><button type="button" class="sc-btn pri sc-retry">重試</button><button type="button" class="sc-btn sc-change">更換文件</button><a class="sc-btn" href="' + wa("你好，我試做 SME Clinic 免費月結單檢查時遇到問題，想查詢。") + '" target="_blank" rel="noopener">WhatsApp 查詢</a></div>'
          : '<p class="sc-note">' + (idx < STEPS.length ? STEPS[idx][1] : "") + "</p>");
      if (errorAt != null) {
        q(".sc-retry").addEventListener("click", run);
        q(".sc-change").addEventListener("click", function () { status.hidden = true; clear(); form.hidden = false; drop.scrollIntoView({ behavior: "smooth", block: "center" }); });
      }
      status.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    function evidence(ev) {
      return (ev || []).length ? '<div class="lb">相關交易或文件頁碼</div><ul class="sc-ev">' + ev.map(function (e) {
        return "<li>" + (e.date ? "<span>" + esc(e.date) + "</span>" : "") + (e.desc ? "<span>" + esc(e.desc) + "</span>" : "") + (e.amount ? '<span class="amt">' + esc(e.amount) + "</span>" : "") + (e.page ? '<span class="pg">第 ' + esc(e.page) + " 頁</span>" : "") + "</li>";
      }).join("") + "</ul>" : "";
    }
    function renderReport() {
      var r = reports[current], cur = r.currency, net = r.totalIn - r.totalOut;
      var tabs = reports.length > 1 ? '<div class="sc-tabs" role="tablist">' + reports.map(function (x, i) {
        return x.empty ? '<button type="button" disabled title="' + esc(x.note || "") + '">' + esc(x.accountLabel) + "（沒有交易）</button>"
          : '<button type="button" role="tab" aria-selected="' + (i === current) + '" data-tab="' + i + '">' + esc(x.accountLabel) + "</button>";
      }).join("") + "</div>" : "";
      var notes = (r.document && r.document.notes && r.document.notes.length) ? '<div class="sc-warn">以下資料未能讀取，結果只包括可核實部分：' + r.document.notes.map(esc).join("；") + "</div>" : "";
      var periodNote = r.period.isLatestMonth ? "" : '<p class="sc-note">此份月結單的期間為 ' + esc(r.period.label) + "，結果只反映該期間，並非現時公司狀況。</p>";
      result.innerHTML =
        '<div class="sc-panel">' + tabs + "<h3>" + esc(r.period.label) + " 月結單免費檢查結果</h3>" +
          '<div class="sc-meta"><span>戶口：<b>' + esc((r.account.bankLabel + " " + r.account.maskedNumber).trim() || "未能辨識") + "</b></span><span>幣種：<b>" + esc(cur) + "</b></span><span>文件：<b>" + (r.document.complete ? "已讀取全部 " + r.document.pagesTotal + " 頁" : "只讀取 " + r.document.pagesRead + " / " + r.document.pagesTotal + " 頁") + "</b></span></div>" +
          notes + periodNote + '<p class="sc-summary">' + esc(r.summary) + "</p>" +
          '<div class="sc-kpis">' + [["期初結餘", money(r.openingBalance, cur)], ["總進帳", money(r.totalIn, cur)], ["總支出", money(r.totalOut, cur)], [net >= 0 ? "淨流入" : "淨流出", money(Math.abs(net), cur)], ["期末結餘", r.document.complete ? money(r.closingBalance, cur) : "未能核實"]].map(function (k) { return '<div class="sc-kpi"><div class="l">' + k[0] + '</div><div class="v">' + k[1] + "</div></div>"; }).join("") + "</div>" +
          '<p class="sc-note">進帳與支出為銀行戶口的資金進出，並非營業額或盈利。共 ' + r.transactions.length + " 筆交易，其中 " + r.transactions.filter(function (t) { return t.confirm; }).length + " 筆列為待確認。</p></div>" +
        '<div class="sc-panel"><h3>銀行可能會問嘅問題</h3><p class="sc-note" style="margin:0 0 10px">以下是根據呢份月結單整理、銀行審批時常會追問嘅事項，每項附交易同頁碼依據。「可能會問」唔代表銀行一定會問，亦唔代表有問題；先準備好答案，就唔會臨時答唔出。</p>' +
          (r.attention.length ? r.attention.map(function (a) {
            return '<div class="sc-q"><h4>' + esc(a.title) + '</h4><div class="lb">報告觀察</div><p>' + esc(a.observation) + '</p><div class="lb">需要準備嘅答案</div><p>' + esc(a.confirm) + "</p>" + evidence(a.evidence) +
              '<div class="sc-row" style="margin-top:12px"><a class="sc-btn sm" href="' + wa("你好，我睇完 SME Clinic 嘅月結單免費檢查，想就『" + a.category + "』呢項結果搵顧問了解。") + '" target="_blank" rel="noopener">就呢項搵顧問</a></div></div>';
          }).join("") : '<p class="sc-note">此份月結單未有需要特別準備答案的項目。有任何結果想了解，都可以搵顧問查詢。</p>') +
          ((r.notFound || []).length ? '<p class="sc-note">' + r.notFound.map(esc).join(" ") + "</p>" : "") + "</div>" +
        '<div class="sc-panel sc-next"><h3>下一步可以自行核對</h3><ol>' + r.nextSteps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
          '<div class="sc-row"><a class="sc-btn pri" href="' + wa("你好，我睇完 SME Clinic 嘅月結單免費檢查，想搵顧問了解結果。") + '" target="_blank" rel="noopener">搵顧問</a>' + (FULL_URL ? '<a class="sc-btn" href="' + esc(FULL_URL) + '">' + esc(FULL_LABEL) + "</a>" : "") + "</div>" +
          '<p class="sc-note">AI 摘要只供初步了解所提交戶口的現金流，不代表完整公司財務評估或任何融資審批結果。</p></div>';
      result.hidden = false;
      result.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { current = Number(b.getAttribute("data-tab")); renderReport(); }); });
    }
    function run() {
      if (!file || !valid) return;
      form.hidden = true; showStatus(1);
      var started = Date.now();
      fetch(API, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file, cache: "no-store" })
        .then(function (res) {
          if (res.status === 504 || res.status === 502) throw new Error("分析在 " + Math.round((Date.now() - started) / 1000) + " 秒後逾時（伺服器回應 " + res.status + "）。請重試；如文件頁數很多，可先試較短的月結單。");
          return res.json().catch(function () { throw new Error("分析服務回應異常（HTTP " + res.status + "），請稍後重試。"); });
        })
        .then(function (data) {
          if (!data.ok) throw new Error(data.message || "今次未能完成分析，請重試或更換文件。");
          reports = data.reports && data.reports.length ? data.reports : [data.report];
          current = reports.findIndex(function (x) { return !x.empty; });
          status.hidden = true; track("FreeCheckComplete"); renderReport();
          result.scrollIntoView({ behavior: "smooth", block: "start" });
        })
        .catch(function (e) {
          var msg = e && e.message ? e.message : "";
          if (!msg || /Failed to fetch|NetworkError|Load failed/i.test(msg)) msg = "未能連接分析服務，請檢查網絡後重試。";
          showStatus(1, 1, msg);
        });
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); if (!valid) return; if (!consent.checked) { consent.focus(); return; } track("FreeCheckStart"); run(); });
    renderEmpty();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
