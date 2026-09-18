/* 診斷端點：只回報設定狀態，不回傳任何金鑰內容。 */
export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  const gemini = !!(process.env.GEMINI_API_KEY || process.env.Gemini_Key || process.env.GEMINI_KEY);
  const anthropic = !!process.env.ANTHROPIC_API_KEY;
  const near = Object.keys(process.env).filter(k => /GEMINI|ANTHROPIC|API_KEY/i.test(k));
  res.end(JSON.stringify({
    ok: true,
    provider: gemini ? "gemini" : anthropic ? "claude" : "none",
    geminiKeySet: gemini,
    anthropicKeySet: anthropic,
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    similarEnvNames: near,
    vercelEnv: process.env.VERCEL_ENV || null,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF || null,
    node: process.version
  }, null, 2));
}
