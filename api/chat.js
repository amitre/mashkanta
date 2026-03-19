const GEMINI_MODEL = 'gemini-1.5-flash';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  try {
    const body = req.body;

    // Build contents
    const contents = (body.messages || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{
        text: typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map(c => c.text || '').join('')
            : ''
      }]
    }));

    // Reinforce JSON on last message
    if (contents.length > 0) {
      const last = contents[contents.length - 1];
      const t = last.parts[0].text;
      if (t.includes('JSON') || t.includes('json')) {
        last.parts[0].text = t +
          '\n\nCRITICAL: Output ONLY the JSON object. No markdown, no backticks, no text before or after. Begin your response with { and end with }.';
      }
    }

    // IMPORTANT: Never use googleSearch for JSON requests — it truncates the response.
    // Gemini's built-in knowledge of Israeli mortgage rates is sufficient and accurate.
    const geminiBody = {
      contents,
      generationConfig: {
        maxOutputTokens: body.max_tokens || 1200,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
      // No tools — clean JSON output every time
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini error:', JSON.stringify(geminiData));
      return res.status(geminiRes.status).json({ error: geminiData.error?.message || 'Gemini error' });
    }

    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    let text = parts.map(p => p.text || '').join('').trim();

    // Strip any residual markdown
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    console.log('Response length:', text.length, '| Preview:', text.substring(0, 60));

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
    console.error('Proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
