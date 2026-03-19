/**
 * /api/debug-rates — בדיקת תשובת ריביות מ-Gemini
 * פתח: https://mashkanta-two.vercel.app/api/debug-rates
 */
export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).send('No API key');

  const prompt = `יועץ משכנתאות ישראלי. ${new Date().toLocaleDateString('he-IL')}.
חפש ריביות עדכניות למשכנתאות ישראל וענה JSON בלבד ללא כלום נוסף:
{"poalim":{"prime":-0.45,"fixed":4.65,"madad":3.00,"variable":4.10},"leumi":{"prime":-0.50,"fixed":4.55,"madad":2.90,"variable":4.05}}

IMPORTANT: Reply with ONLY the raw JSON object. No markdown. No backticks. Start directly with { and end with }.`;

  const geminiBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
    tools: [{ googleSearch: {} }],
  };

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
  );

  const data = await geminiRes.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const rawText = parts.map(p => p.text || '').join('');

  // Try parse
  let parsed = null, parseError = null;
  try {
    const cleaned = rawText.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim();
    parsed = JSON.parse(cleaned);
  } catch(e) { parseError = e.message; }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><title>Debug Rates</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px;direction:ltr}
pre{background:#161b22;padding:16px;border-radius:8px;overflow:auto;white-space:pre-wrap;font-size:13px;margin:12px 0}
.ok{color:#3fb950}.err{color:#f85149}.lbl{color:#d4a853;font-weight:bold;font-size:14px}</style></head>
<body>
<p class="lbl">Raw text from Gemini (${rawText.length} chars):</p>
<pre>${rawText.replace(/</g,'&lt;') || '(empty)'}</pre>

<p class="lbl">Parse result:</p>
<pre class="${parsed ? 'ok' : 'err'}">${parsed ? JSON.stringify(parsed, null, 2) : 'FAILED: ' + parseError}</pre>

<p class="lbl">Full Gemini response:</p>
<pre>${JSON.stringify(data, null, 2).replace(/</g,'&lt;')}</pre>
</body></html>`);
}
