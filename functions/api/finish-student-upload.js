// Endpoint descontinuado: sistema 100% autônomo pós-edital
export async function onRequestPost(context) {
  return new Response(JSON.stringify({ error: 'Upload descontinuado. Calibração 100% autônoma.' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
}
