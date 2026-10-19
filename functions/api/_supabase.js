// Helper nativo para Cloudflare Pages Functions: Supabase REST, Auth Admin, Storage e Resend Email API
// Zero dependências externas — compatibilidade 100% nativa com o runtime dos Workers da Cloudflare.

export function getCorsHeaders(request) {
  const origin = request ? request.headers.get('Origin') || '' : '';
  const isAllowed =
    origin === 'https://crivos.me' ||
    origin.endsWith('.crivos.me') ||
    origin === 'https://crivos.com.br' ||
    origin.endsWith('.crivos.com.br') ||
    origin === 'https://crivos-web.pages.dev' ||
    origin.endsWith('.crivos-web.pages.dev') ||
    origin.endsWith('.pages.dev') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  const defaultOrigin = origin.includes('pages.dev')
    ? origin
    : origin.includes('crivos.me')
    ? origin
    : 'https://crivos-web.pages.dev';

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : defaultOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  };
}

export function getSupabaseConfig(env) {
  const url = (env?.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = env?.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = env?.SUPABASE_ANON_KEY || '';

  if (!url || !serviceKey) {
    console.warn('[CRIVOS] Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.');
  }

  return { url, serviceKey, anonKey };
}

// Executa requisições REST autenticadas com Service Role no Supabase PostgREST
export async function supabaseRest(env, endpoint, options = {}) {
  const { url, serviceKey } = getSupabaseConfig(env);
  if (!url || !serviceKey) {
    throw new Error('Supabase não configurado no servidor.');
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const requestUrl = `${url}/rest/v1${cleanEndpoint}`;

  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...options.headers,
  };

  const response = await fetch(requestUrl, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!response.ok) {
    console.error(`[Supabase REST Error] ${response.status} ${requestUrl}:`, data);
    const err = new Error(data?.message || data?.error || 'Erro na comunicação com Supabase');
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

// Criação ou busca de usuário no Supabase Auth usando Admin API
export async function supabaseAdminCreateUser(env, { email, password, userMetadata = {} }) {
  const { url, serviceKey } = getSupabaseConfig(env);
  if (!url || !serviceKey) {
    throw new Error('Supabase Admin não configurado no servidor.');
  }

  const requestUrl = `${url}/auth/v1/admin/users`;

  const payload = {
    email: email.trim().toLowerCase(),
    password: String(password),
    email_confirm: true,
    user_metadata: userMetadata,
  };

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    // Se o usuário já existe, pesquisa o ID dele
    if (data?.msg?.includes('already been registered') || data?.message?.includes('already exists')) {
      console.log(`[Supabase Auth] Usuário ${email} já existe. Buscando ID...`);
      const listRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=50`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      });
      const listData = await listRes.json();
      const existing = listData?.users?.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) return existing;
    }

    console.error('[Supabase Auth Admin Error]:', data);
    throw new Error(data.message || data.msg || 'Falha ao criar usuário no Supabase Auth.');
  }

  return data;
}

// Upload direto de arquivo binário para Supabase Storage (ex: PDF de edital)
export async function supabaseStorageUpload(env, bucket, path, fileBuffer, contentType = 'application/pdf') {
  const { url, serviceKey } = getSupabaseConfig(env);
  if (!url || !serviceKey) {
    throw new Error('Supabase Storage não configurado.');
  }

  const requestUrl = `${url}/storage/v1/object/${bucket}/${path}`;

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Supabase Storage Upload Error] ${response.status}:`, errText);
    throw new Error(`Falha no upload para o storage: ${errText}`);
  }

  return { path, bucket };
}

// Disparo de e-mails transacionais via API HTTP do Resend
export async function sendResendEmail(env, { to, subject, html, text }) {
  const apiKey = env?.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY não definida. Simulação de envio de e-mail para:', to);
    return { id: `simulated-${Date.now()}` };
  }

  const fromEmail = env?.CRIVOS_EMAIL_FROM || 'CRIVOS // Sistemas <acesso@crivos.me>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || undefined,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Resend Error]:', data);
    throw new Error(data?.message || 'Falha ao enviar e-mail via Resend.');
  }

  return data;
}

// Gerador de senhas temporárias no padrão tático CRIVOS
export function generateTacticalPassword() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let segment = '';
  for (let i = 0; i < 4; i++) {
    segment += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `CRV-${digits}-${segment}`;
}

// Template HTML Editorial Suíço para E-mail #1: Credenciais & Status de Calibração
export function renderEmailCredentials({ email, password, planTitle, concurso, cargo, panelUrl = 'https://crivos-painel.pages.dev' }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>CRIVOS // Suas Credenciais de Acesso</title>
</head>
<body style="margin:0;padding:24px;background-color:#F4F4F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111111;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #111111;box-shadow:4px 4px 0px #111111;">
    <tr>
      <td style="padding:16px 24px;background:#111111;color:#FFFFFF;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;letter-spacing:0.05em;">
        ■ CRIVOS // SISTEMA OPERACIONAL DE ESTUDOS PÓS-EDITAL
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <div style="display:inline-block;background:#15803d;color:#FFFFFF;padding:4px 8px;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;margin-bottom:16px;">
          [✓ TRANSAÇÃO CONFIRMADA • SLOT GARANTIDO]
        </div>

        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;">
          SUAS CREDENCIAIS DE ACESSO
        </h1>

        <p style="font-size:13px;line-height:1.6;color:#444444;margin:0 0 20px 0;">
          Seu pedido foi registrado com sucesso. Nossa equipe de engenharia tática já recebeu seu concurso, cargo e declaração de rotina para calibrar seu Sistema Operacional.
        </p>

        <!-- Caixa de Credenciais -->
        <div style="background:#F4F4F0;border:1px solid #111111;border-left:4px solid #D92B2B;padding:16px;margin-bottom:24px;font-family:'Courier New',Courier,monospace;font-size:13px;line-height:1.8;">
          <div><strong>PLANO:</strong> ${planTitle}</div>
          <div><strong>CONCURSO:</strong> ${concurso} (${cargo})</div>
          <div><strong>ACESSO PAINEL:</strong> <a href="${panelUrl}" style="color:#1D4ED8;font-weight:bold;">${panelUrl}</a></div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #CCCCCC;">
            <div><strong>LOGIN (E-MAIL):</strong> ${email}</div>
            <div><strong>SENHA TEMPORÁRIA:</strong> <span style="background:#FFFFFF;padding:2px 6px;border:1px solid #111111;font-weight:bold;color:#D92B2B;">${password}</span></div>
          </div>
        </div>

        <!-- Alerta de Prazo de Calibração -->
        <div style="border:1px solid #111111;padding:16px;margin-bottom:24px;font-size:12px;line-height:1.6;">
          <strong style="color:#D92B2B;font-family:'Courier New',Courier,monospace;display:block;margin-bottom:6px;">
            [ STATUS ATUAL: EM CALIBRAÇÃO TÁTICA // PRAZO ATÉ 48H ]
          </strong>
          Você já pode acessar o painel agora para conferir o status da engenharia e personalizar seu perfil (nome, foto e nova senha definitiva). Assim que os arquivos e o cronograma estiverem 100% montados, você receberá um segundo e-mail de liberação.
        </div>

        <!-- Botão CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${panelUrl}" style="display:inline-block;width:100%;box-sizing:border-box;background:#D92B2B;color:#FFFFFF;text-decoration:none;padding:14px;font-weight:bold;font-size:13px;text-transform:uppercase;border:1px solid #111111;box-shadow:2px 2px 0px #111111;">
            [ ACESSAR MEU PAINEL CRIVOS ] →
          </a>
        </div>

        <p style="font-size:11px;color:#777777;font-family:'Courier New',Courier,monospace;line-height:1.5;margin:0;">
          Dúvidas ou envio de material complementar: contato@crivos.me ou via WhatsApp de suporte.<br>
          Recomendamos alterar sua senha no primeiro acesso na aba 12 · Perfil.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 28px;background:#F4F4F0;border-top:1px solid #111111;font-family:'Courier New',Courier,monospace;font-size:10px;color:#666666;text-align:center;">
        CRIVOS // Sistemas de Estudo Sob Demanda • Feito por e para concursados
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Template HTML Editorial Suíço para E-mail #2: Liberação do Painel Pronto
export function renderEmailPanelReady({ email, planTitle, concurso, cargo, panelUrl = 'https://crivos-painel.pages.dev' }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>CRIVOS // Seu Sistema Está Pronto</title>
</head>
<body style="margin:0;padding:24px;background-color:#F4F4F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111111;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #111111;box-shadow:4px 4px 0px #111111;">
    <tr>
      <td style="padding:16px 24px;background:#111111;color:#FFFFFF;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;letter-spacing:0.05em;">
        ■ CRIVOS // SISTEMA OPERACIONAL LIBERADO
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <div style="display:inline-block;background:#15803d;color:#FFFFFF;padding:4px 8px;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;margin-bottom:16px;">
          [✓ CALIBRAÇÃO CONCLUÍDA COM SUCESSO]
        </div>

        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;">
          SEU PLANO DE APROVAÇÃO ESTÁ PRONTO
        </h1>

        <p style="font-size:13px;line-height:1.6;color:#444444;margin:0 0 20px 0;">
          A engenharia tática do seu concurso (<strong>${concurso} — ${cargo}</strong>) foi concluída. Seu cronograma diário elástico, banco de matérias e arquivos já estão carregados no seu painel.
        </p>

        <div style="background:#F4F4F0;border:1px solid #111111;border-left:4px solid #15803d;padding:16px;margin-bottom:24px;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.6;">
          <div><strong>CONCURSO:</strong> ${concurso}</div>
          <div><strong>NÍVEL:</strong> ${planTitle}</div>
          <div><strong>GARANTIA DE AJUSTE:</strong> 7 dias corridos para recalibração de carga se necessário</div>
        </div>

        <!-- Botão CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${panelUrl}" style="display:inline-block;width:100%;box-sizing:border-box;background:#111111;color:#FFFFFF;text-decoration:none;padding:14px;font-weight:bold;font-size:13px;text-transform:uppercase;border:1px solid #111111;box-shadow:2px 2px 0px #D92B2B;">
            [ ABRIR MEU SISTEMA OPERACIONAL DE ESTUDOS ] →
          </a>
        </div>

        <p style="font-size:11px;color:#777777;font-family:'Courier New',Courier,monospace;line-height:1.5;margin:0;">
          Basta entrar com seu e-mail (<strong>${email}</strong>) e sua senha.<br>
          Bons estudos e execução fria.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 28px;background:#F4F4F0;border-top:1px solid #111111;font-family:'Courier New',Courier,monospace;font-size:10px;color:#666666;text-align:center;">
        CRIVOS // Inteligência para Concursos e Exames • contato@crivos.me
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
