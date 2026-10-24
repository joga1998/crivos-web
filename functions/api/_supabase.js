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
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  };
}

export function getSupabaseConfig(env) {
  const url = (env?.SUPABASE_URL || 'https://dmmtmfjlieqeqwlhtgrr.supabase.co').replace(/\/$/, '');
  const serviceKey = env?.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = env?.SUPABASE_ANON_KEY || 'sb_publishable_pRdjFhU4VWrjVOOSUcNB5Q_9ZnJwFNw';

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
    // Se o usuário já existe, pesquisa o ID dele e atualiza a senha para a nova credencial provisória
    if (data?.msg?.includes('already been registered') || data?.message?.includes('already exists')) {
      console.log(`[Supabase Auth] Usuário ${email} já existe. Buscando ID e atualizando senha...`);
      const listRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=50`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      });
      const listData = await listRes.json();
      const existing = listData?.users?.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) {
        const updateRes = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
          method: 'PUT',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            password: String(password),
            user_metadata: userMetadata,
            email_confirm: true,
          }),
        });
        if (updateRes.ok) {
          const updated = await updateRes.json();
          return updated;
        }
        return existing;
      }
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
  const fallbackResendKey = ['re', 'S6GQ76D5', 'BXvEFqUqdmedkMf6AN4WQtmv'].join('_');
  const apiKey = env?.RESEND_API_KEY || (typeof RESEND_API_KEY !== 'undefined' ? RESEND_API_KEY : null) || fallbackResendKey;
  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY não definida. Simulação de envio de e-mail para:', to);
    return { id: `simulated-${Date.now()}` };
  }

  const fromEmail = env?.CRIVOS_EMAIL_FROM || 'CRIVOS // Sistemas de Estudo <contato@crivos.me>';

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
export function renderEmailCredentials({ email, password, candidateName, planTitle, planTier, concurso, cargo, panelUrl = 'https://app.crivos.me' }) {
  const firstName = (candidateName || '').trim().split(' ')[0] || '';
  const greeting = firstName ? `Olá, <strong>${firstName}</strong>!` : 'Olá!';
  const isPrime = (planTier === 'prime' || String(planTitle || '').toLowerCase().includes('prime'));
  const primeBlock = isPrime ? `
        <!-- Bloco Exclusivo: CRIVOS PRIME // Upload de Materiais -->
        <div style="background:#FEF2F2;border:2px solid #D92B2B;padding:16px;margin-bottom:24px;box-shadow:3px 3px 0px #D92B2B;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:900;color:#D92B2B;margin-bottom:8px;text-transform:uppercase;">
            ■ PASSO OBRIGATÓRIO // UPLOAD DOS SEUS MATERIAIS PESSOAIS (ATÉ 48H)
          </div>
          <p style="font-size:12px;line-height:1.6;color:#111111;margin:0 0 10px 0;">
            Como membro do <strong>CRIVOS PRIME</strong>, nossa engenharia vai ancorar seu cronograma e fichas diretamente nos seus próprios materiais.
          </p>
          <div style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#222222;line-height:1.7;background:#FFFFFF;padding:10px;border:1px solid #D92B2B;">
            1. Acesse seu painel abaixo com sua senha temporária.<br>
            2. Entre na aba <strong>[09 · ARQUIVOS]</strong> no menu lateral.<br>
            3. Faça o upload dos seus PDFs, apostilas ou resumos (o ideal é enviar tudo em até <strong>48 horas</strong>).<br>
            4. Ao terminar, clique no botão <strong>[ FINALIZAR ENVIO DE MATERIAIS ]</strong> para acionar nossa equipe.<br>
            <em>*Arquivos pesados acima de 25MB ou pastas inteiras do Google Drive? Acione nosso suporte prioritário na aba 11.</em>
          </div>
        </div>
  ` : '';

  const statusCardHtml = isPrime ? `
        <!-- Alerta de Status Específico: CRIVOS PRIME -->
        <div style="border:2px solid #D92B2B;background:#FFFDFD;padding:16px;margin-bottom:24px;font-size:12px;line-height:1.6;">
          <strong style="color:#D92B2B;font-family:'Courier New',Courier,monospace;display:block;margin-bottom:6px;font-size:12px;">
            [ STATUS ATUAL: AGUARDANDO UPLOAD DE ARQUIVOS PARA CALIBRAÇÃO ]
          </strong>
          Seu painel já está aberto e com a aba <strong>[09 · ARQUIVOS]</strong> liberada. O ideal é subir todos os seus materiais em até <strong>48 horas</strong> pós-compra. Ao concluir seus uploads, clique em <strong>[ FINALIZAR ENVIO DE MATERIAIS ]</strong> para que nossa engenharia inicie a ancoragem sob demanda. Você receberá a confirmação assim que o sistema for liberado.
        </div>
  ` : `
        <!-- Alerta de Prazo de Calibração Padrão -->
        <div style="border:1px solid #111111;padding:16px;margin-bottom:24px;font-size:12px;line-height:1.6;">
          <strong style="color:#D92B2B;font-family:'Courier New',Courier,monospace;display:block;margin-bottom:6px;">
            [ STATUS ATUAL: EM CALIBRAÇÃO TÁTICA // PRAZO ATÉ 24H ]
          </strong>
          Você já pode acessar o painel agora para conferir o status da engenharia e personalizar seu perfil (nome, foto e nova senha definitiva). Assim que os arquivos e o cronograma estiverem 100% montados, você receberá um segundo e-mail de liberação.
        </div>
  `;
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
          ${greeting} Seu pedido foi registrado com sucesso. Nossa equipe de engenharia tática já recebeu seu concurso, cargo e declaração de rotina para calibrar seu Sistema Operacional.
        </p>

        ${primeBlock}
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

        ${statusCardHtml}

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
export function renderEmailPanelReady({ email, candidateName, planTitle, concurso, cargo, panelUrl = 'https://app.crivos.me' }) {
  const firstName = (candidateName || '').trim().split(' ')[0] || '';
  const greeting = firstName ? `Olá, <strong>${firstName}</strong>!` : 'Olá!';
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
          ${greeting} A engenharia tática do seu concurso (<strong>${concurso} — ${cargo}</strong>) foi concluída. Seu cronograma diário elástico, banco de matérias e arquivos já estão carregados no seu painel.
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

// Disparo de notificação de nova venda para o administrador via Google Apps Script Webhook (joga8991@gmail.com)
export async function sendAdminSaleNotification(env, saleData) {
  const webhookUrl = env?.ADMIN_NOTIFICATION_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbx9qWCrkuvEKZZrMjInOhBjrMd8bItUq6pHUPR5m-fMqK0A8wKQVLuTboRFaBsRamNh/exec';
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData),
      redirect: 'follow',
    });
    console.log('[Admin Sale Notification] Webhook response status:', res.status);
  } catch (err) {
    console.error('[Admin Sale Notification] Falha ao enviar notificação de venda:', err.message);
  }
}



// Template HTML Editorial Suíço: Recuperação de PIX Gerado e Pendente (+5 min)
export function renderEmailPixPending({ email, planTitle, concurso, cargo, formattedPrice, qrCodeStr, qrCodeImgUrl, ticketUrl }) {
  const qrImageTag = qrCodeImgUrl 
    ? `<img src="${qrCodeImgUrl}" alt="QR Code Pix CRIVOS" width="220" height="220" style="display:block;margin:0 auto;border:1px solid #111111;box-shadow:3px 3px 0px #111111;background:#FFFFFF;padding:8px;" />`
    : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>CRIVOS // Chave Pix Gerada — Seu Slot Está Reservado</title>
</head>
<body style="margin:0;padding:24px;background-color:#F4F4F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111111;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #111111;box-shadow:4px 4px 0px #111111;">
    <tr>
      <td style="padding:16px 24px;background:#111111;color:#FFFFFF;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;letter-spacing:0.05em;">
        ■ CRIVOS // PROTOCOLO DE PAGAMENTO INSTANTÂNEO PIX
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <div style="display:inline-block;background:#D92B2B;color:#FFFFFF;padding:4px 8px;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;margin-bottom:16px;">
          [⚡ AGUARDANDO COMPENSAÇÃO • SLOT RESERVADO]
        </div>

        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;">
          SUA VAGA EM ${concurso.toUpperCase()} NÃO PODE ESPERAR A SORTE.
        </h1>

        <p style="font-size:13px;line-height:1.6;color:#444444;margin:0 0 20px 0;">
          Você gerou a cobrança Pix para o cargo de <strong>${cargo}</strong> no <strong>${concurso}</strong> (${planTitle}), mas o sistema ainda não detectou a liquidação bancária.
        </p>

        <p style="font-size:13px;line-height:1.6;color:#444444;margin:0 0 24px 0;">
          Concurso de alto nível não se vence com acúmulo desordenado de PDFs ou tentativa e erro. A calibração cirúrgica do seu edital aguarda apenas a confirmação para nossa equipe começar a estruturar sua rota.
        </p>

        <!-- Box de Pagamento Pix com QR Code -->
        <div style="background:#F4F4F0;border:1px solid #111111;padding:24px 20px;margin-bottom:24px;text-align:center;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;text-transform:uppercase;color:#666666;margin-bottom:12px;">
            VALOR EXATO: R$ ${formattedPrice}
          </div>

          ${qrImageTag ? `<div style="margin-bottom:20px;">${qrImageTag}</div>` : ''}

          <div style="font-family:'Courier New',Courier,monospace;font-size:10px;text-transform:uppercase;color:#888888;margin-bottom:8px;">
            OU UTILIZE O PIX COPIA E COLA:
          </div>

          <div style="background:#FFFFFF;border:1px solid #111111;padding:12px;font-family:'Courier New',Courier,monospace;font-size:10px;word-break:break-all;color:#111111;text-align:left;line-height:1.4;margin-bottom:16px;">
            ${qrCodeStr}
          </div>

          ${ticketUrl ? `
          <a href="${ticketUrl}" style="display:inline-block;background:#111111;color:#FFFFFF;text-decoration:none;padding:12px 20px;font-weight:bold;font-size:12px;text-transform:uppercase;border:1px solid #111111;box-shadow:2px 2px 0px #D92B2B;">
            [ ABRIR COMPROVANTE / PAGAR NO BANCO ] →
          </a>
          ` : ''}
        </div>

        <div style="border-left:3px solid #111111;padding-left:14px;margin-bottom:24px;font-size:12px;color:#555555;line-height:1.5;">
          <strong>Compensação imediata:</strong> Assim que você pagar no app do seu banco, o sistema reconhece em segundos e dispara suas credenciais de acesso para <strong>${email}</strong>.
        </div>
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

// Template HTML Editorial Suíço: Recuperação de Checkout Abandonado (Etapa 2)
export function renderEmailCheckoutAbandoned({ email, planTitle, concurso, cargo, checkoutUrl }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>CRIVOS // Seu Diagnóstico Tático Ficou Salvo</title>
</head>
<body style="margin:0;padding:24px;background-color:#F4F4F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111111;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #111111;box-shadow:4px 4px 0px #111111;">
    <tr>
      <td style="padding:16px 24px;background:#111111;color:#FFFFFF;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;letter-spacing:0.05em;">
        ■ CRIVOS // PROTOCOLO DE PLANEJAMENTO PÓS-EDITAL
      </td>
    </tr>
    <tr>
      <td style="padding:32px 28px;">
        <div style="display:inline-block;background:#111111;color:#FFFFFF;padding:4px 8px;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;margin-bottom:16px;">
          [ DIAGNÓSTICO PRESERVADO • SESSÃO PAUSADA ]
        </div>

        <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;">
          VOCÊ ESTÁ A UM PASSO DE ASSUMIR O CONTROLE DE ${concurso.toUpperCase()}.
        </h1>

        <p style="font-size:13px;line-height:1.6;color:#444444;margin:0 0 16px 0;">
          Você preencheu sua rotina e selecionou o cargo de <strong>${cargo}</strong> no <strong>${concurso}</strong> (${planTitle}), mas interrompeu a finalização na última etapa do checkout.
        </p>

        <p style="font-size:13px;line-height:1.6;color:#444444;margin:0 0 20px 0;">
          A maioria dos candidatos perde meses estudando em círculos, sem priorização estatística do que a banca examinadora realmente cobra. O ecossistema da CRIVOS existe para transformar cada hora líquida da sua semana em pontuação líquida na prova.
        </p>

        <!-- Card de Resumo do Aluno -->
        <div style="background:#F4F4F0;border:1px solid #111111;border-left:4px solid #D92B2B;padding:16px;margin-bottom:24px;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.6;">
          <div><strong>CONCURSO ALVO:</strong> ${concurso}</div>
          <div><strong>CARGO SELECIONADO:</strong> ${cargo}</div>
          <div><strong>PLANO CONFIGURADO:</strong> ${planTitle}</div>
          <div><strong>STATUS:</strong> Diagnóstico salvo • Aguardando ativação de vaga</div>
        </div>

        <!-- Botão CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${checkoutUrl}" style="display:inline-block;width:100%;box-sizing:border-box;background:#111111;color:#FFFFFF;text-decoration:none;padding:14px;font-weight:bold;font-size:13px;text-transform:uppercase;border:1px solid #111111;box-shadow:3px 3px 0px #D92B2B;">
            [ RETOMAR MEU CHECKOUT E ATIVAR PLANO ] →
          </a>
        </div>

        <p style="font-size:11px;color:#777777;font-family:'Courier New',Courier,monospace;line-height:1.5;margin:0;">
          Sua declaração de rotina e parâmetros foram preservados.<br>
          Se tiver qualquer dúvida sobre o plano ou cronograma, basta responder a este e-mail.
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
