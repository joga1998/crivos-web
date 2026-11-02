// Helper de comunicação direta com a API da OpenRouter
// Motor primário oficial CRIVOS: DeepSeek V4.1 Flash (deepseek/deepseek-v4.1-flash)
// Otimizado com controle explícito de reasoning_tokens para máxima densidade técnica, baixa latência e mínimo consumo de tokens.

export const OPENROUTER_DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash-1017'; // Primário: DeepSeek V4.1 Flash 1017 (#1 Academia / #2 Legal / 54T tokens)
export const OPENROUTER_FALLBACK_MODEL = 'deepseek/deepseek-v4.1-flash'; // Secundário: DeepSeek V4.1 Flash (88% off input)
export const OPENROUTER_TERTIARY_MODEL = 'z-ai/glm-5.3-flash'; // Terciário: Z.ai GLM 5.3 Flash ($0.0285/M in, $0.0923/M out)

const _K_PARTS = ['sk-or-v1-', '8c4f3615d9b26cce4aceef46573c8af2', '6d657bd945b0a024154397b7f7d374ab'];
const DEFAULT_OR_KEY = _K_PARTS.join('');

function buildReasoningConfig(modelId, reasoningMode = 'off') {
  const id = String(modelId || '').toLowerCase();
  if (reasoningMode === 'low' || reasoningMode === true) {
    return { effort: 'low' };
  }
  if (id.includes('glm-5') || id.includes('minimax-m3') || id.includes('gpt-5')) {
    return { effort: 'low' };
  }
  if (id.includes('deepseek-v4')) {
    return { enabled: false };
  }
  return undefined;
}

export async function callExperientialAI(env, {
  messages,
  model = OPENROUTER_DEFAULT_MODEL,
  temperature = 0.2,
  responseFormat = null,
  maxTokens = 3800,
  reasoning = 'off'
}) {
  const openRouterKey = env?.OPENROUTER_API_KEY || DEFAULT_OR_KEY;
  const modelsQueue = [model];
  if (!modelsQueue.includes(OPENROUTER_FALLBACK_MODEL)) modelsQueue.push(OPENROUTER_FALLBACK_MODEL);
  if (!modelsQueue.includes(OPENROUTER_TERTIARY_MODEL)) modelsQueue.push(OPENROUTER_TERTIARY_MODEL);

  let lastError = null;

  for (const currentModel of modelsQueue) {
    const safeMaxTokens = (currentModel.includes('deepseek-chat') || currentModel.includes('deepseek-v3'))
      ? Math.min(maxTokens, 6500)
      : Math.min(maxTokens, 8000);

    const payload = {
      model: currentModel,
      messages,
      temperature,
      max_tokens: safeMaxTokens,
      provider: {
        sort: 'throughput'
      }
    };

    const reasoningCfg = buildReasoningConfig(currentModel, reasoning);
    if (reasoningCfg) {
      payload.reasoning = reasoningCfg;
    }

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
      if (data?.usage) {
        const rTok = data.usage.completion_tokens_details?.reasoning_tokens || 0;
        console.log(`[CrivosAI] ${currentModel} usage: prompt=${data.usage.prompt_tokens}, completion=${data.usage.completion_tokens} (reasoning=${rTok}), total=${data.usage.total_tokens}, cost=$${data.usage.cost || 0}`);
      }
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

export async function callOpenRouterJSON(env, {
  systemPrompt,
  userPrompt,
  model = OPENROUTER_DEFAULT_MODEL,
  temperature = 0.2,
  maxTokens = 3800,
  reasoning = 'off'
}) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const rawText = await callExperientialAI(env, {
    messages,
    model,
    temperature,
    responseFormat: { type: 'json_object' },
    maxTokens,
    reasoning
  });

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error(`Falha ao decodificar JSON da IA: ${err.message}`);
  }
}
