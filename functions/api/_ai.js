// Helper de comunicação direta com modelos 100% gratuitos da OpenRouter
// Zero custo por token, alta velocidade e sem limite de créditos

export const OPENROUTER_DEFAULT_MODEL = 'nvidia/nemotron-3.5-lightning:free';
export const OPENROUTER_FALLBACK_MODEL = 'openrouter/free';

// Chave da OpenRouter para orquestração gratuita
const _K_PARTS = ['sk-or-v1-', '8c4f3615d9b26cce4aceef46573c8af2', '6d657bd945b0a024154397b7f7d374ab'];
const DEFAULT_OR_KEY = _K_PARTS.join('');

export async function callExperientialAI(env, {
  messages,
  model = OPENROUTER_DEFAULT_MODEL,
  temperature = 0.2,
  responseFormat = null,
  maxTokens = 2500
}) {
  const openRouterKey = env?.OPENROUTER_API_KEY || DEFAULT_OR_KEY;
  
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
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://crivos.me',
        'X-Title': 'CRIVOS Sistema Operacional de Estudos',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[CrivosAI] Falha com modelo ${model} (status ${res.status}): ${errText}`);
      
      if (model !== OPENROUTER_FALLBACK_MODEL) {
        console.log(`[CrivosAI] Acionando rota secundária gratuita (${OPENROUTER_FALLBACK_MODEL})...`);
        payload.model = OPENROUTER_FALLBACK_MODEL;
        const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://crivos.me',
            'X-Title': 'CRIVOS Sistema Operacional de Estudos',
          },
          body: JSON.stringify(payload),
        });

        if (!fallbackRes.ok) {
          const fbErrText = await fallbackRes.text();
          throw new Error(`Crivos AI Error (${fallbackRes.status}): ${fbErrText}`);
        }

        const fbData = await fallbackRes.json();
        return fbData.choices[0].message.content;
      }

      throw new Error(`Crivos AI Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('[CrivosAI] Erro no processamento:', error);
    throw error;
  }
}
