const GEMINI_MODEL = 'gemini-2.5-flash';

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

    // Build Gemini contents
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

    // Strengthen the last user message: demand JSON only
    if (contents.length > 0) {
      const last = contents[contents.length - 1];
      const originalText = last.parts[0].text;
      // If the prompt expects JSON, reinforce it strongly
      if (originalText.includes('JSON') || originalText.includes('json')) {
        last.parts[0].text = originalText +
          '\n\n[CRITICAL: Return ONLY raw JSON. No markdown, no backticks, no explanation, no preamble. Start your response with { and end with }]';
      }
    }

    const needsSearch = (body.tools || []).some(t => (t.type || '').includes('web_search'));

    const geminiBody = {
      contents,
      generationConfig: {
        maxOutputTokens: body.max_tokens || 1000,
        temperature: 0.4,
        responseMimeType: 'application/json', // Force JSON output mode
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
      console.error('Gemini error:', JSON.stringify(geminiData));
      return res.status(geminiRes.status).json({
        error: geminiData.error?.message || 'Gemini API error',
        details: geminiData
      });
    }

    // Extract text — handle both text and JSON parts
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    let text = parts.map(p => p.text || '').join('');

    // Clean up any markdown wrapping Gemini might still add
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    console.log('Gemini response length:', text.length, 'starts:', text.substring(0, 50));

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
