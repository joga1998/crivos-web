import { getCorsHeaders, supabaseRest, sendAdminSaleNotification, sendResendEmail } from './_supabase.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, panelId, notes } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Identificador do usuário é obrigatório.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 1. Localiza o painel do aluno
    let userPanel = null;
    if (panelId) {
      const panels = await supabaseRest(env, `/user_panels?id=eq.${encodeURIComponent(panelId)}`);
      if (Array.isArray(panels) && panels.length > 0) userPanel = panels[0];
    }
    if (!userPanel) {
      const panels = await supabaseRest(env, `/user_panels?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`);
      if (Array.isArray(panels) && panels.length > 0) userPanel = panels[0];
    }

    const planTier = (userPanel?.plan_tier || '').toLowerCase();
    if (planTier !== 'prime') {
      return new Response(JSON.stringify({ 
        error: 'Recurso exclusivo do Plano CRIVOS PRIME.' 
      }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // 2. Busca lista de arquivos já enviados pelo aluno
    let uploadedFiles = [];
    if (userPanel?.id) {
      const files = await supabaseRest(env, `/user_files?panel_id=eq.${encodeURIComponent(userPanel.id)}&order=created_at.asc`);
      if (Array.isArray(files)) uploadedFiles = files;
    }
    if (uploadedFiles.length === 0) {
      const files = await supabaseRest(env, `/user_files?user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`);
      if (Array.isArray(files)) uploadedFiles = files;
    }

    // 3. Busca dados do perfil / usuário
    let userProfile = null;
    const profiles = await supabaseRest(env, `/profiles?id=eq.${encodeURIComponent(userId)}`);
    if (Array.isArray(profiles) && profiles.length > 0) userProfile = profiles[0];

    // 4. Busca dados da ordem se disponível
    let userOrder = null;
    if (userPanel?.order_id) {
      const orders = await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(userPanel.order_id)}`);
      if (Array.isArray(orders) && orders.length > 0) userOrder = orders[0];
    }

    const studentEmail = userProfile?.email || userOrder?.email || 'Aluno Prime';
    const studentName = userProfile?.full_name || userOrder?.full_name || 'Candidato Prime';
    const concursoNome = userPanel?.concurso || userOrder?.concurso_nome || 'Concurso CRIVOS';
    const cargoNome = userPanel?.cargo || userOrder?.cargo || 'Cargo Selecionado';

    // 5. Atualiza o status do painel ou flags de notas indicando que os uploads foram concluídos
    const nowIso = new Date().toISOString();
    if (userPanel?.id) {
      const currentHdr = userPanel.header_config || {};
      await supabaseRest(env, `/user_panels?id=eq.${encodeURIComponent(userPanel.id)}`, {
        method: 'PATCH',
        body: {
          header_config: {
            ...currentHdr,
            prime_upload_completed: true,
            prime_upload_completed_at: nowIso,
            prime_upload_count: uploadedFiles.length,
          },
          updated_at: nowIso,
        }
      });
    }

    if (userOrder?.id) {
      let existingNotes = {};
      try { existingNotes = JSON.parse(userOrder.notes || '{}'); } catch(e){}
      await supabaseRest(env, `/orders?id=eq.${encodeURIComponent(userOrder.id)}`, {
        method: 'PATCH',
        body: {
          notes: JSON.stringify({
            ...existingNotes,
            prime_upload_completed: true,
            prime_upload_completed_at: nowIso,
            prime_upload_count: uploadedFiles.length,
            student_notes: notes || undefined,
          }),
          updated_at: nowIso,
        }
      });
    }

    // 6. Notifica o administrador via Webhook / E-mail
    try {
      await sendAdminSaleNotification(env, {
        event: 'PRIME_UPLOAD_FINALIZADO',
        plan_title: 'CRIVOS // Nível 4 · Prime (Materiais Enviados)',
        amount: '288,00',
        student_name: studentName,
        student_email: studentEmail,
        concurso: concursoNome,
        cargo: cargoNome,
        order_id: userOrder?.id || userPanel?.order_id || 'PRIME',
        total_files: uploadedFiles.length,
        files_list: uploadedFiles.map(f => f.title || f.filename).join(', '),
        timestamp: nowIso,
        notes: notes || 'O aluno finalizou o envio de seus materiais pessoais.',
      });
    } catch (notifErr) {
      console.warn('[finish-student-upload] Aviso ao notificar webhook admin:', notifErr.message);
    }

    // 7. Envia confirmação por e-mail para o administrador e para o aluno via Resend
    try {
      const filesHtmlList = uploadedFiles.map(f => `<li><strong>${f.title || f.filename}</strong> (${f.storage_url ? `<a href="${f.storage_url}">Baixar Arquivo</a>` : 'Anexado'})</li>`).join('');
      
      // E-mail para admin
      await sendResendEmail(env, {
        to: 'joga8991@gmail.com',
        subject: `CRIVOS // [PRIME] Materiais Enviados — ${concursoNome} (${studentName})`,
        html: `
          <div style="font-family:'Courier New',Courier,monospace;padding:20px;background:#FFFFFF;border:2px solid #D92B2B;">
            <h2 style="color:#D92B2B;margin-top:0;">■ CRIVOS PRIME // UPLOAD DE MATERIAIS CONCLUÍDO</h2>
            <p>O aluno <strong>${studentName}</strong> (${studentEmail}) finalizou o envio dos seus materiais pessoais para a calibração sob demanda.</p>
            <p><strong>Concurso:</strong> ${concursoNome}<br><strong>Cargo:</strong> ${cargoNome}<br><strong>Total de Arquivos:</strong> ${uploadedFiles.length}</p>
            <div style="background:#F4F4F0;padding:12px;border:1px solid #111111;margin:16px 0;">
              <strong>Arquivos Recebidos:</strong>
              <ul>${filesHtmlList || '<li>Nenhum arquivo individual listado</li>'}</ul>
            </div>
            ${notes ? `<p><strong>Observações do Aluno:</strong> ${notes}</p>` : ''}
            <p style="font-size:11px;color:#666666;">Engenharia CRIVOS • Iniciar ancoragem de cronograma</p>
          </div>
        `,
        text: `CRIVOS PRIME: O aluno ${studentName} (${studentEmail}) finalizou o upload de ${uploadedFiles.length} arquivos para o concurso ${concursoNome}.`
      });

      // E-mail de confirmação para o aluno
      await sendResendEmail(env, {
        to: studentEmail,
        subject: `CRIVOS // Materiais Recebidos com Sucesso — Calibração Prime Iniciada`,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#FFFFFF;border:1px solid #111111;box-shadow:4px 4px 0px #111111;">
            <div style="display:inline-block;background:#15803d;color:#FFFFFF;padding:4px 8px;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;margin-bottom:14px;">
              [✓ MATERIAIS RECEBIDOS // CALIBRAÇÃO INICIADA]
            </div>
            <h2 style="font-size:20px;font-weight:900;text-transform:uppercase;margin:0 0 12px 0;">SEUS ARQUIVOS ESTÃO COM NOSSA ENGENHARIA</h2>
            <p style="font-size:13px;line-height:1.6;color:#333333;">
              Olá, <strong>${studentName}</strong>! Confirmamos o recebimento dos seus materiais (${uploadedFiles.length} arquivo${uploadedFiles.length === 1 ? '' : 's'}).
            </p>
            <p style="font-size:13px;line-height:1.6;color:#333333;">
              Nossa equipe de engenharia tática e pedagogia já deu início à ancoragem do seu cronograma individualizado e das suas fichas com base direta nas suas apostilas e PDFs para o cargo de <strong>${cargoNome}</strong> no <strong>${concursoNome}</strong>.
            </p>
            <div style="background:#F4F4F0;border-left:4px solid #D92B2B;padding:14px;margin:18px 0;font-size:12px;line-height:1.6;">
              <strong>Prazo de Engenharia:</strong> Conforme nossa fila prioritária Prime, seu Sistema Operacional completo será entregue e liberado em até 6 horas úteis.
            </div>
            <p style="font-size:12px;color:#666666;">
              Assim que o cronograma estiver 100% montado, você receberá um novo e-mail avisando que todos os módulos estão destravados.
            </p>
          </div>
        `,
        text: `Olá ${studentName}! Confirmamos o recebimento dos seus ${uploadedFiles.length} arquivos. Nossa engenharia já iniciou a ancoragem da sua rotina para ${concursoNome}. Prazo Prime: até 6 horas úteis.`
      });
    } catch (emailErr) {
      console.warn('[finish-student-upload] Aviso ao disparar e-mails:', emailErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Uploads finalizados com sucesso. Nossa equipe de engenharia já foi notificada para iniciar a calibração.',
        totalFiles: uploadedFiles.length,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[finish-student-upload] Erro interno:', err);
    return new Response(
      JSON.stringify({ error: 'Falha interna ao concluir envio de materiais.', details: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
