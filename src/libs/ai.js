import config from '../../config.js';

export async function askAI(prompt, systemInstruction = null) {
  if (config.geminiApiKey) {
    const models = ['gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;
        const reqBody = {
          contents: [{ parts: [{ text: prompt }] }]
        };
        if (systemInstruction) {
          reqBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
          signal: AbortSignal.timeout(15000)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return reply.trim();
        }
      } catch (err) {
        // Fallback to next model or free provider
      }
    }
  }

  // Keyless Free Providers
  const freeModels = ['stepfun/step-3.7-flash:free', 'openrouter/free', 'kilo-auto/free'];
  for (const model of freeModels) {
    try {
      const res = await fetch('https://api.kilo.ai/api/gateway/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Jawablah dalam bahasa Indonesia dengan santai, jelas, dan ramah.' },
            { role: 'user', content: prompt }
          ]
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && typeof content === 'string') return content.trim();
      }
    } catch {}
  }

  return 'Maaf, server AI sedang mengalami antrean. Silakan coba kirim ulang beberapa saat lagi.';
}

