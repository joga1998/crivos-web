// Cloudflare Pages Function: Salva o diagnóstico de estudos (Etapa 1) e anexo do edital no Supabase
import { getCorsHeaders, supabaseRest, supabaseStorageUpload } from './_supabase.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  try {
    const contentType = request.headers.get('content-type') || '';
    let email, concurso, cargo, availability, plan, editalBase64, editalFileName, editalMimeType;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email;
      concurso = body.concurso;
      cargo = body.cargo;
      availability = body.availability;
      plan = body.plan;
      editalBase64 = body.editalBase64;
      editalFileName = body.editalFileName;
      editalMimeType = body.editalMimeType;
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      email = formData.get('email');
      concurso = formData.get('concurso');
      cargo = formData.get('cargo');
      availability = formData.get('availability');
      plan = formData.get('plan');
      
      const file = formData.get('editalFile');
      if (file && typeof file === 'object' && file.name) {
        editalFileName = file.name;
        editalMimeType = file.type || 'application/pdf';
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        editalBase64 = btoa(binary);
      }
    } else {
      return new Response(JSON.stringify({ error: 'Content-Type não suportado.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return new Response(JSON.stringify({ error: 'E-mail inválido informado.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!concurso || !cargo) {
      return new Response(JSON.stringify({ error: 'Concurso e cargo são obrigatórios.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const planPrices = {
      tatico: 67.00,
      arsenal: 124.00,
      elite: 221.00,
    };

    const cleanPlan = (plan || 'tatico').toLowerCase();
    const amount = planPrices[cleanPlan] || 67.00;

    // 1. Cria o registro inicial em `orders` com status `pending`
    const generatedOrderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    // Extrai horas semanais totais se presentes ("Carga Semanal Total Estimada: 18" ou "18h")
    let safeHours = 20;
    const weeklyMatch = String(availability || '').match(/Carga Semanal Total Estimada:\s*(\d+)/i) 
      || String(availability || '').match(/(\d+)\s*h\s*\/\s*semana/i)
      || String(availability || '').match(/\b(\d+)\s*horas?\s*semanais?/i);
    if (weeklyMatch && weeklyMatch[1]) {
      safeHours = Math.min(168, Math.max(1, parseInt(weeklyMatch[1], 10)));
    } else {
      const parsedHours = parseInt(String(availability || '20').match(/\d+/)?.[0] || '20', 10);
      safeHours = Number.isFinite(parsedHours) && parsedHours > 0 ? Math.min(168, parsedHours) : 20;
    }

    const orderPayload = {
      id: generatedOrderId,
      email: cleanEmail,
      concurso_nome: String(concurso).trim(),
      cargo: String(cargo).trim(),
      horas_semanais: safeHours,
      plan_tier: cleanPlan,
      amount_cents: Math.round(amount * 100),
      status: 'pending',
      notes: JSON.stringify({ availability: String(availability || '').trim() }),
    };

    const insertResult = await supabaseRest(env, '/orders', {
      method: 'POST',
      body: orderPayload,
      prefer: 'return=representation',
    });

    const newOrder = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    const orderId = newOrder?.id || generatedOrderId;

    // 2. Se houver arquivo de edital anexado, sobe para o bucket `intake-editais`
    let storagePath = null;
    if (orderId && editalBase64 && editalFileName) {
      try {
        const sanitizedFileName = editalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        storagePath = `${orderId}/${sanitizedFileName}`;

        // Converte base64 para Uint8Array
        const byteCharacters = atob(editalBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const fileBuffer = new Uint8Array(byteNumbers);

        await supabaseStorageUpload(
          env,
          'intake-editais',
          storagePath,
          fileBuffer,
          editalMimeType || 'application/pdf'
        );

        // Atualiza a coluna edital_file_url na ordem
        await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(orderId)}`, {
          method: 'PATCH',
          body: { edital_file_url: storagePath, updated_at: new Date().toISOString() },
        });
      } catch (uploadErr) {
        console.warn('[save-intake] Falha ao salvar arquivo de edital:', uploadErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        editalStoragePath: storagePath,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[save-intake] Erro ao salvar intake:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao registrar dados do pedido.', details: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request),
  });
}
