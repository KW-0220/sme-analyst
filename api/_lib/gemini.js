/* Google Gemini API 抽取（REST，無需 SDK）。回傳 { ok:true, extracted } 或 { ok:false, code, message } */
import { Extraction, SYSTEM_PROMPT, GEMINI_SCHEMA, expandCompact } from "./schema.js";

/* 免費層每個模型每日只有少量請求額度；主模型回報每日額度用盡時，依次改用後備模型 */
export const DEFAULT_FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.5-flash"];

export async function extractWithGemini(buf, opts) {
  const chain = [opts.model].concat((opts.fallbackModels || DEFAULT_FALLBACK_MODELS).filter(m => m !== opts.model));
  let last = null;
  for (const model of chain) {
    const r = await extractOnce(buf, { apiKey: opts.apiKey, model });
    if (r.ok || (r.code !== "quota_day" && r.code !== "unavailable")) return Object.assign(r, { model });
    last = r;
  }
  if (last && last.code === "unavailable") return Object.assign({}, last, { code: "api", message: "AI 服務目前需求高峰，暫時未能回應，請稍後重試。" });
  return Object.assign({}, last, { code: "rate_limit", message: "AI 服務今日的免費額度已用完，請明天再試或聯絡我們。" });
}

async function extractOnce(buf, { apiKey, model }) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
  const makeBody = (thinking) => ({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [
      { inlineData: { mimeType: "application/pdf", data: buf.toString("base64") } },
      { text: "請抽取這份文件的資料，並以指定的 JSON 結構輸出。" }
    ] }],
    /* 抽取屬機械式工作，思考設為最低以縮短時間；輸出上限用模型最大值，避免交易多的結單被截斷 */
    generationConfig: Object.assign({ responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA, temperature: 0, maxOutputTokens: 65536 },
      thinking ? { thinkingConfig: { thinkingLevel: "MINIMAL" } } : {})
  });
  /* 429（配額或每分鐘上限）及 503（需求高峰）屬暫時性，等候後自動重試一次；
     模型不接受 thinkingConfig 時（400）改以預設設定重送 */
  let res, thinking = true, waits = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(makeBody(thinking)) });
    } catch (e) {
      return { ok: false, code: "api", message: "未能連接 AI 服務，請稍後重試。" };
    }
    if (res.status === 429) {
      const t = await res.clone().text().catch(() => "");
      if (/PerDay/i.test(t)) return { ok: false, code: "quota_day", message: "此模型今日的免費額度已用完。" };
    }
    if ((res.status === 429 || res.status === 503) && waits < 1) { waits++; await new Promise(r => setTimeout(r, 12000)); continue; }
    if (res.status === 503) return { ok: false, code: "unavailable", message: "此模型目前需求高峰。" };
    if (res.status === 400 && thinking) {
      const t = await res.clone().text().catch(() => "");
      if (/thinking/i.test(t)) { thinking = false; continue; }
    }
    break;
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const t = await res.text().catch(() => "");
    if (/API key|API_KEY|PERMISSION_DENIED|UNAUTHENTICATED/i.test(t)) return { ok: false, code: "auth", message: "AI 服務金鑰無效或沒有權限，請聯絡網站管理員。" };
    return { ok: false, code: "bad_request", message: "未能處理此文件，請確認是完整、未加密的 PDF。" };
  }
  if (res.status === 429) return { ok: false, code: "rate_limit", message: "AI 服務目前繁忙（已達每分鐘上限），請一分鐘後重試。" };
  if (res.status === 404) return { ok: false, code: "api", message: "AI 模型設定無效（" + model + "），請聯絡網站管理員。" };
  if (!res.ok) return { ok: false, code: "api", message: "AI 服務暫時未能回應（" + res.status + "），請稍後重試。" };

  const data = await res.json();
  const cand = data.candidates && data.candidates[0];
  if (!cand) {
    const reason = data.promptFeedback && data.promptFeedback.blockReason;
    return { ok: false, code: "refusal", message: "AI 服務未有回應此文件" + (reason ? "（" + reason + "）" : "") + "。請確認文件為公司銀行月結單。" };
  }
  if (cand.finishReason === "MAX_TOKENS") return { ok: false, code: "too_long", message: "此文件的交易數量太多，AI 服務一次未能完成抽取。請先試交易較少的月份或單一戶口的月結單；如經常遇到，請聯絡我們。" };
  if (cand.finishReason && cand.finishReason !== "STOP") return { ok: false, code: "refusal", message: "AI 服務中止處理此文件（" + cand.finishReason + "）。請確認文件為公司銀行月結單。" };
  const text = (cand.content && cand.content.parts || []).map(p => p.text || "").join("");
  let parsed;
  try { parsed = expandCompact(JSON.parse(text)); } catch (e) { return { ok: false, code: "parse", message: "AI 服務回應格式不完整，請重試。" }; }
  const v = Extraction.safeParse(parsed);
  if (!v.success) return { ok: false, code: "parse", message: "AI 服務回應的資料結構不符（" + v.error.issues[0].path.join(".") + "），請重試。" };
  return { ok: true, extracted: v.data, usage: data.usageMetadata || null };
}
