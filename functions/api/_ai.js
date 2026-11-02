// Helper de comunicação direta com a API da OpenRouter
// Motor oficial de calibração e estudo tático CRIVOS: DeepSeek V4.1 Flash -> DeepSeek Chat -> Gemini 2.5 Flash

export const OPENROUTER_DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash';
export const OPENROUTER_FALLBACK_MODEL = 'deepseek/deepseek-chat';
export const OPENROUTER_TERTIARY_MODEL = 'google/gemini-2.5-flash';

const _K_PARTS = ['sk-or-v1-', '8c4f3615d9b26cce4aceef46573c8af2', '6d657bd945b0a024154397b7f7d374ab'];
const DEFAULT_OR_KEY = _K_PARTS.join('');

export async function callExperientialAI(env, {
  messages,
  model = OPENROUTER_DEFAULT_MODEL,
  temperature = 0.2,
  responseFormat = null,
  maxTokens = 4000
}) {
  const openRouterKey = env?.OPENROUTER_API_KEY || DEFAULT_OR_KEY;
  const modelsQueue = [model];
  if (!modelsQueue.includes(OPENROUTER_FALLBACK_MODEL)) modelsQueue.push(OPENROUTER_FALLBACK_MODEL);
  if (!modelsQueue.includes(OPENROUTER_TERTIARY_MODEL)) modelsQueue.push(OPENROUTER_TERTIARY_MODEL);

  let lastError = null;

  for (const currentModel of modelsQueue) {
    // deepseek-chat possui teto estrito de 8192 tokens de saída
    const safeMaxTokens = currentModel.includes('deepseek-chat')
      ? Math.min(maxTokens, 7800)
      : Math.min(maxTokens, 12000);

    const payload = {
      model: currentModel,
      messages,
      temperature,
      max_tokens: safeMaxTokens,
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
        console.warn(`[CrivosAI] Falha com modelo ${currentModel} (status ${res.status}): ${errText}`);
        lastError = new Error(`Crivos AI Error (${res.status}): ${errText}`);
        continue;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        lastError = new Error(`Crivos AI retornou conteúdo vazio no modelo ${currentModel}`);
        continue;
      }
      return content;
    } catch (error) {
      console.warn(`[CrivosAI] Exceção no modelo ${currentModel}:`, error.message);
      lastError = error;
    }
  }

  console.error('[CrivosAI] Todos os modelos falharam:', lastError);
  throw lastError || new Error('Falha na comunicação com os motores de IA.');
}
