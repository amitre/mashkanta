/**
 * /api/test.js — דף אבחון
 * פתח בדפדפן: https://YOUR-SITE.vercel.app/api/test
 * יראה בדיוק מה עובד ומה לא
 */
export default async function handler(req, res) {
  const results = { timestamp: new Date().toISOString(), checks: {} };

  // 1. בדוק שה-Key קיים
  const key = process.env.GEMINI_API_KEY;
  results.checks.api_key_exists = !!key;
  results.checks.api_key_prefix = key ? key.substring(0, 8) + '...' : 'MISSING';

  // 2. בדוק חיבור ל-Gemini
  if (key) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Say "OK" only.' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        }
      );
      const data = await r.json();
      if (r.ok) {
        results.checks.gemini_connection = 'SUCCESS';
        results.checks.gemini_response = data.candidates?.[0]?.content?.parts?.[0]?.text || 'empty';
      } else {
        results.checks.gemini_connection = 'FAILED';
        results.checks.gemini_error = data.error?.message || JSON.stringify(data);
      }
    } catch(e) {
      results.checks.gemini_connection = 'ERROR';
      results.checks.gemini_error = e.message;
    }
  }

  // 3. בדוק שה-proxy עובד
  results.checks.proxy_function = 'OK';
  results.checks.node_version = process.version;

  // HTML response
  const ok = results.checks.gemini_connection === 'SUCCESS';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><title>אבחון מערכת</title>
<style>
  body{font-family:sans-serif;background:#0d1117;color:#e6edf3;padding:30px;direction:rtl}
  h1{margin-bottom:20px}
  .check{padding:12px 16px;border-radius:8px;margin:8px 0;display:flex;gap:12px;align-items:center;font-size:15px}
  .ok{background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.3)}
  .fail{background:rgba(248,81,73,.1);border:1px solid rgba(248,81,73,.3)}
  .icon{font-size:20px}
  .detail{font-size:12px;color:#8b949e;margin-top:4px}
  pre{background:#161b22;padding:16px;border-radius:8px;overflow:auto;font-size:12px;margin-top:20px}
</style></head>
<body>
<h1>${ok ? '✅ המערכת תקינה' : '❌ נמצאה בעיה'}</h1>

<div class="check ${results.checks.api_key_exists ? 'ok' : 'fail'}">
  <span class="icon">${results.checks.api_key_exists ? '✅' : '❌'}</span>
  <div>
    <div>GEMINI_API_KEY</div>
    <div class="detail">${results.checks.api_key_prefix}</div>
  </div>
</div>

<div class="check ${results.checks.gemini_connection === 'SUCCESS' ? 'ok' : 'fail'}">
  <span class="icon">${results.checks.gemini_connection === 'SUCCESS' ? '✅' : '❌'}</span>
  <div>
    <div>חיבור ל-Gemini API</div>
    <div class="detail">${results.checks.gemini_error || results.checks.gemini_response || results.checks.gemini_connection}</div>
  </div>
</div>

<div class="check ok">
  <span class="icon">✅</span>
  <div>
    <div>Serverless Function</div>
    <div class="detail">Node.js ${results.checks.node_version}</div>
  </div>
</div>

${!ok ? `
<div style="margin-top:20px;padding:16px;background:rgba(248,81,73,.08);border:1px solid rgba(248,81,73,.2);border-radius:8px">
  <strong>מה לעשות:</strong><br><br>
  ${!results.checks.api_key_exists ? '1. ב-Vercel → Settings → Environment Variables → הוסף GEMINI_API_KEY עם ה-Key מ-aistudio.google.com<br>2. לאחר הוספה — לחץ Redeploy' : ''}
  ${results.checks.api_key_exists && results.checks.gemini_connection !== 'SUCCESS' ? '1. ודא שה-Key תקין ב-aistudio.google.com → API Keys<br>2. ודא שה-Gemini API מופעל בפרויקט שלך<br>3. נסה ליצור Key חדש' : ''}
</div>` : ''}

<pre>${JSON.stringify(results, null, 2)}</pre>
</body></html>`);
}
