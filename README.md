# SME Clinic 月結單初步分析網站

網址：https://www.analyst.sme-clinic-ai.com

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
| `report.html` | 初步結果頁，含問題卡片、「搵顧問」、前往官網區塊、下載摘要、刪除流程。原型可加 `&partial=1` 顯示部分可讀狀態，`&delete=fail` 模擬刪除失敗 |
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
- `js/api.js`：後端介接存根。正式系統須以真實 API 取代。

## 接入真實後端

`js/api.js` 定義四個函數：`startAnalysis`、`pollStatus`、`getReport`、`deleteReport`。真實系統須：

1. `startAnalysis` 以安全方式上載檔案，回傳工作識別碼。
2. `pollStatus` 回傳實際處理階段。狀態頁只按回傳值更新，不使用假倒數。
3. `getReport` 回傳與 `js/demo-data.js` 相同結構的真實資料，並將 `isFictional` 設為 `false`。報告頁的「原型示範資料」標記只在 `isFictional` 為 `true` 時出現，示範資料因此不會混入真實分析。
4. `deleteReport` 實際刪除原始文件、抽取資料及報告，備份處理須與私隱政策一致。
5. 報告網址須有存取控制（例如一次性連結或有效期），並保持 `noindex`。`robots.txt` 已排除分析及報告頁。

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

## 部署到 www.analyst.sme-clinic-ai.com（Vercel）

目前該網址沒有任何 DNS 紀錄，所以瀏覽器看不到內容。網站是純靜態檔案，Vercel 不需任何建置設定：

1. 在 Vercel 按 Add New → Project，匯入 GitHub 倉庫 `KW-0220/sme-analyst`。
2. Framework Preset 選 Other；Build Command 留空；Output Directory 留空（根目錄）。
3. Settings → Git → Production Branch 設為要上線的分支（目前為 `claude/website-design-pages-74x4d8`，合併後改為 `main`）。
4. Settings → Domains 加入 `www.analyst.sme-clinic-ai.com`。Vercel 會顯示要新增的 DNS 紀錄，一般是 CNAME `www.analyst` 指向 `cname.vercel-dns.com`。
5. 到 sme-clinic-ai.com 的 DNS 管理（目前由 Cloudflare 解析）新增該紀錄。如在 Cloudflare，先設為 DNS only（灰雲），待 Vercel 顯示 Valid Configuration 後再決定是否開啟代理。
6. 之後每次推送到 Production Branch 都會自動部署。

`vercel.json` 為報告、分析及授權頁加上 `X-Robots-Tag: noindex` 與 `Cache-Control: no-store`，並為全站加上基本安全標頭。

## 上線前

見 `docs/launch-checklist.md`。
