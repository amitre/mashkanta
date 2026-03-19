/**
 * /api/chat.js — Vercel Serverless Function
 *
 * מתרגם בקשות בפורמט Anthropic → Google Gemini API (חינמי, ללא כרטיס אשראי)
 * ה-API Key שמור ב-Environment Variable בצד השרת בלבד.
 *
 * מודל: gemini-2.5-flash  (חינמי: 10 req/min, 250 req/day)
 */

const GEMINI_MODEL = 'gemini-2.5-flash';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set on server' });

  try {
    const body = req.body;

    // Translate Anthropic messages → Gemini contents
    const contents = (body.messages || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{
        text: typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content) ? msg.content.map(c => c.text || '').join('') : ''
      }]
    }));

    // Enable Google Search if web_search tool was requested
    const needsSearch = (body.tools || []).some(t => (t.type || '').includes('web_search'));

    const geminiBody = {
      contents,
      generationConfig: {
        maxOutputTokens: body.max_tokens || 1000,
        temperature: 0.7,
      },
      ...(needsSearch ? { tools: [{ googleSearch: {} }] } : {}),
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: geminiData.error?.message || 'Gemini API error'
      });
    }

    // Translate Gemini → Anthropic response format
    const text = (geminiData.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || '').join('');

    return res.status(200).json({
      id: 'msg_gemini',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text }],
      model: GEMINI_MODEL,
      stop_reason: 'end_turn',
      usage: { input_tokens: 0, output_tokens: 0 },
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
