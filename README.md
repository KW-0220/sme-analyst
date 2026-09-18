# SME Clinic 月結單初步分析網站

網址：https://analyst.sme-clinic-ai.com（DNS 已指向 Vercel；`www.analyst.sme-clinic-ai.com` 尚未設定紀錄）

這是一個靜態多頁網站（HTML、CSS、原生 JavaScript），不需要建置工具。任何靜態伺服器都可以直接部署整個目錄。

## 本地預覽

```bash
python3 -m http.server 8765
# 開啟 http://127.0.0.1:8765/
```

## 頁面

| 檔案 | 用途 |
|---|---|
| `index.html` | 首頁：導覽、Hero、先睇你會收到甚麼、認識 SME Clinic、文件使用說明、上載區、常見問題、頁尾 |
| `demo-report.html` | 示範報告，毋須登入或上載即可閱讀，頂部常駐「虛構資料示範」標記 |
| `analysis.html` | 分析狀態頁。原型可用 `?state=` 強制顯示：`checking`、`reading`、`summarizing`、`done`、`failed`、`unreadable`、`partial` |
| `report.html` | 初步結果頁，含問題卡片、「搵顧問」、前往官網區塊、下載摘要、刪除流程。報告由 `?job=` 對應的瀏覽器工作階段讀取 |
| `authorize.html` | 顧問查看報告的獨立授權畫面。`?state=fail` 模擬失敗 |
| `about.html`、`privacy.html`、`terms.html` | 關於我們、私隱政策及文件使用說明、使用條款 |
| `full-analysis-intake.html` | 官網「完整分析入口」版型：文件清單、可沿用文件、用途及處理安排、上載 |
| `full-analysis.html` | 官網「完整分析報告」版型：分析期間及已收文件、財務摘要、各項分析、問題與待確認事項、下一步 |

## 程式結構

- `css/styles.css`：全站樣式。品牌色值取樣自用戶提供的公司 Logo（青綠 `#119aa3`、深藍 `#13294b`）。
- `js/config.js`：所有須核實的營運資料。值為 `null` 時頁面顯示「待核實」標記。
- `js/site.js`：頁首、頁尾、Logo、追蹤事件、手機固定按鈕、問題卡片與「搵顧問」視窗。
- `js/upload.js`：上載區狀態機（未選檔、已選檔、格式不支援、檔案過大、已加密）。
- `js/analysis.js`：分析狀態頁。
- `js/report.js`：報告繪製（收支卡片、結餘折線、交易整理、留意事項、下一步）。
- `js/demo-data.js`：示範報告數據，`isFictional: true`。
- `js/api.js`：前端與後端介接。檔案經 IndexedDB 交給狀態頁上載，報告保存在 sessionStorage。
- `api/analyze.js`：Vercel 無伺服器函數。接收 PDF，交 Claude 抽取結構化資料（zod schema），再由 `api/_lib/build-report.js` 計算收支、核對結餘、產生留意事項。
- `scripts/dev-server.mjs`：本地開發伺服器，掛載 `/api/analyze`。

## 分析後端

流程：首頁選檔並同意 → 檔案存入瀏覽器 IndexedDB → 狀態頁以 `application/octet-stream` POST 到 `/api/analyze` → 函數檢查 PDF 格式、大小及加密 → 以 base64 文件交給 AI 模型按固定結構抽取（Google Gemini 或 Claude，見下）→ `build-report.js` 由抽取資料計算報告 → 回傳 JSON → 瀏覽器存入 sessionStorage 並顯示。

模型供應商由環境變數決定：設定了 `GEMINI_API_KEY`（亦接受 `Gemini_Key`）用 Google Gemini（預設模型 `gemini-3.5-flash`，可用 `GEMINI_MODEL` 更改；主模型每日額度用盡或需求高峰時，依 `GEMINI_FALLBACK_MODELS` 或內置清單自動改用其他模型）；否則設定了 `ANTHROPIC_API_KEY` 用 Claude（預設 `claude-opus-5`，可用 `CLAUDE_MODEL` 更改）。兩者共用同一抽取結構（`api/_lib/schema.js`），回傳後都經 zod 驗證。如更換供應商，須同步更新 `js/config.js` 內 `processing.processors` 及保留說明。

- 伺服器不儲存文件、抽取資料或報告；報告只在產生它的瀏覽器工作階段可見。
- 綜合結單：模型一次抽取全部戶口的交易並標明所屬戶口；每個戶口、每種幣種各自成一份報告，不同幣種不相加。多於一個戶口時，狀態頁讓用戶選擇先看哪個，報告頁可切換。
- 缺頁或模糊時回傳 `partial`，報告只顯示可核實項目並列明缺漏。
- 環境變數：`GEMINI_API_KEY` 或 `ANTHROPIC_API_KEY`（二選一，在 Vercel → Settings → Environment Variables 設定）、`GEMINI_MODEL`／`CLAUDE_MODEL`（可選）、`SME_MAX_MB`（可選，預設 4）、`SME_MOCK=1`（本地測試，不呼叫 API）。
- 戶口號碼只回傳最後 4 位；戶口持有人名稱不回傳瀏覽器。
- `vercel.json` 將函數 `maxDuration` 設為 300 秒。
- Gemini 免費層每個模型每日只有 20 次請求，且每分鐘有 token 上限；正式對外服務前應在 Google AI Studio 為專案啟用計費。實測：4 頁 16 筆交易約 10 至 50 秒，8 頁 120 筆約 40 秒，輸出約每筆交易 80 至 100 token。

本地測試：

```bash
npm install
SME_MOCK=1 node scripts/dev-server.mjs      # 模擬資料，不呼叫 Claude
GEMINI_API_KEY=... node scripts/dev-server.mjs
```

## Hero 相片

首頁 Hero 依用戶提供的橫額圖版式製作，相片為 `assets/hero-photo.jpg`（由橫額圖 `assets/hero-banner.jpg` 右方裁出）；檔案缺失時會顯示品牌色底作後備。頁首及頁尾 Logo 使用 `assets/logo.png`（`js/config.js` 的 `logoImage`）；設為 `null` 時改用 `js/site.js` 內的 SVG 重繪版本。

## 追蹤事件

事件只送名稱及位置參數，不含檔名、帳號、交易或金額。事件推送到 `window.dataLayer`。

| 事件 | 觸發 |
|---|---|
| `demo_report_click` | 點擊示範報告（`placement`：hero、what、upload、about） |
| `trust_info_view` | 公司介紹或文件使用說明進入視窗 |
| `file_selected` | 選擇文件 |
| `upload_success` | 同意並成功送出 |
| `analysis_complete`、`analysis_failed`、`analysis_partial` | 分析狀態 |
| `report_view` | 查看報告（`report`：prelim 或 full） |
| `go_full_analysis_click` | 前往官網做完整分析 |
| `advisor_click` | 「搵顧問」點擊（`placement`：card 或 footer） |
| `whatsapp_open` | 前往 WhatsApp |
| `report_download`、`report_deleted`、`advisor_authorized` | 報告操作 |

## 部署到 analyst.sme-clinic-ai.com（Vercel）

網站是純靜態檔案，Vercel 不需任何建置設定：

1. 在 Vercel 按 Add New → Project，匯入 GitHub 倉庫 `KW-0220/sme-analyst`。
2. Framework Preset 選 Other；Build Command 留空；Output Directory 留空（根目錄）。
3. Settings → Git → Production Branch 設為要上線的分支（目前為 `claude/website-design-pages-74x4d8`，合併後改為 `main`）。
4. Settings → Domains 加入 `analyst.sme-clinic-ai.com`（已完成）。如亦要支援 `www.analyst.sme-clinic-ai.com`，在同頁再加入該網域並設為 Redirect 到主網域，然後在 DNS 加 CNAME `www.analyst` 指向 Vercel 顯示的目標。
5. 到 sme-clinic-ai.com 的 DNS 管理（目前由 Cloudflare 解析）新增該紀錄。如在 Cloudflare，先設為 DNS only（灰雲），待 Vercel 顯示 Valid Configuration 後再決定是否開啟代理。
6. 之後每次推送到 Production Branch 都會自動部署。

`vercel.json` 為報告、分析及授權頁加上 `X-Robots-Tag: noindex` 與 `Cache-Control: no-store`，並為全站加上基本安全標頭。

## 上線前

見 `docs/launch-checklist.md`。
