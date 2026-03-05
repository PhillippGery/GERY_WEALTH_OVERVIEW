// Netlify serverless function — AI proxy
// Supports Claude (Anthropic), GPT (OpenAI), and Gemini (Google)
// API key can be supplied by the user in the request body, or fall back to env variable

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      },
      body: '',
    };
  }

  // ── LIST MODELS (GET) — used by Auto-detect in the browser ──────────────
  if (event.httpMethod === 'GET') {
    const apiKey = event.queryStringParameters?.apiKey;
    if (!apiKey) return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No apiKey' }) };
    const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    return { statusCode: res.status, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const provider = (body.provider || 'claude').toLowerCase();
  // User-supplied key takes priority; fall back to env variable
  const apiKey =
    body.apiKey ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'No API key provided. Please add your API key in the Settings page.',
      }),
    };
  }

  try {
    // ── CLAUDE (Anthropic) ──────────────────────────────────────────────────
    if (provider === 'claude') {
      const model = body.model || 'claude-haiku-4-5-20251001';
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: body.max_tokens || 1000,
          messages: body.messages,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: data.error?.message || 'Anthropic API error' }),
        };
      }
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // ── GPT (OpenAI) ────────────────────────────────────────────────────────
    if (provider === 'openai' || provider === 'gpt') {
      const model = body.model || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: body.max_tokens || 1000,
          messages: body.messages,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: data.error?.message || 'OpenAI API error' }),
        };
      }
      // Normalise to Anthropic-style response so frontend stays the same
      const normalized = {
        content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }],
      };
      return { statusCode: 200, headers, body: JSON.stringify(normalized) };
    }

    // ── GEMINI (Google) ─────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const model = body.model || 'gemini-1.5-flash';
      // Convert Anthropic-style messages to Gemini format
      const geminiContents = body.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: Array.isArray(m.content)
          ? m.content.map(c => {
              if (c.type === 'text') return { text: c.text };
              if (c.type === 'document' && c.source?.type === 'base64') {
                return {
                  inlineData: {
                    mimeType: c.source.media_type,
                    data: c.source.data,
                  },
                };
              }
              return { text: '' };
            })
          : [{ text: m.content }],
      }));

      // v1beta supports all current Gemini models
      const apiVersion = 'v1beta';
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: { maxOutputTokens: body.max_tokens || 1000 },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: data.error?.message || 'Gemini API error' }),
        };
      }
      // Normalise to Anthropic-style response
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const normalized = { content: [{ type: 'text', text }] };
      return { statusCode: 200, headers, body: JSON.stringify(normalized) };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unknown provider: ${provider}. Use "claude", "openai", or "gemini".` }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
