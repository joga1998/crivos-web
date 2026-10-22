// Cloudflare Pages Function: Fornece chaves públicas dinâmicas (ex: MP_PUBLIC_KEY de produção ou teste)
import { getCorsHeaders } from './_supabase.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  // Lê a Public Key das variáveis de ambiente da Cloudflare (ou fallback seguro)
  const mpPublicKey = env?.MP_PUBLIC_KEY || 'TEST-767fa6bd-0213-4fb9-b1fd-6f9957a397b4';

  return new Response(
    JSON.stringify({
      mpPublicKey,
    }),
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request),
  });
}
