// Helper de comunicação direta com a API da Experiential Labs
// Endpoint universal OpenAI-compatible com 0% markup e alta performance em Rust

export const EXPERIENTIAL_DEFAULT_MODEL = 'deepseek-v4.1-flash';
export const EXPERIENTIAL_FALLBACK_MODEL = 'gpt-6-luna';

export async function callExperientialAI(env, {
  messages,
  model = EXPERIENTIAL_DEFAULT_MODEL,
  temperature = 0.2,
  responseFormat = { type: 'json_object' },
  maxTokens = 4000
}) {
  const apiKey = env?.EXPERIENTIAL_API_KEY || 'xpl_2f11ddc57a5b838f1fad016fe2c5ddb8fe6ed45e';
  if (!apiKey) {
    throw new Error('EXPERIENTIAL_API_KEY não configurada no ambiente.');
  }

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  try {
    const res = await fetch('https://api.experientiallabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[ExperientialAI] Falha com modelo ${model} (status ${res.status}): ${errText}`);
      
      // Fallback para o modelo secundário gratuito caso o primeiro falhe
      if (model !== EXPERIENTIAL_FALLBACK_MODEL) {
        console.log(`[ExperientialAI] Tentando fallback para ${EXPERIENTIAL_FALLBACK_MODEL}...`);
        payload.model = EXPERIENTIAL_FALLBACK_MODEL;
        const fallbackRes = await fetch('https://api.experientiallabs.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!fallbackRes.ok) {
          const fbErrText = await fallbackRes.text();
          throw new Error(`Experiential API Error (${fallbackRes.status}): ${fbErrText}`);
        }

        const fbData = await fallbackRes.json();
        return fbData.choices[0].message.content;
      }

      throw new Error(`Experiential API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('[ExperientialAI] Erro na requisição:', error);
    throw error;
  }
}
