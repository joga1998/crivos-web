// Cloudflare Pages Function: Teste de conectividade com Experiential Labs a partir da borda da Cloudflare
export async function onRequestGet(context) {
  const key = 'xpl_2f11ddc57a5b838f1fad016fe2c5ddb8fe6ed45e';
  try {
    const res = await fetch('https://api.experientiallabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4.1-flash',
        messages: [{ role: 'user', content: 'responda apenas: OK' }],
        max_tokens: 5
      })
    });

    const status = res.status;
    const text = await res.text();
    return new Response(JSON.stringify({
      status,
      edge_cf: context.request.cf,
      response: text
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
