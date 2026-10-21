# GUIA DE IMPLANTAÇÃO // BANCO DE DADOS & PERSONALIZAÇÃO CRIVOS

Este documento descreve a arquitetura e o passo a passo de configuração do banco de dados (Supabase PostgreSQL + Auth + Storage), das Cloudflare Pages Functions e do sistema de personalização individualizada de painéis (`crivos-painel`).

---

## 1. Estrutura do Banco de Dados (Supabase)

O script DDL completo está localizado em:
`crivos-web/supabase/migrations/001_initial_schema.sql`

### Como aplicar:
1. Acesse o painel do seu projeto no **Supabase** ([supabase.com](https://supabase.com)).
2. Vá em **SQL Editor** no menu lateral esquerdo.
3. Cole o conteúdo de `001_initial_schema.sql` e clique em **Run**.
4. O script criará:
   - **Tabelas**: `profiles`, `orders`, `user_panels`, `user_files`, `user_progress`, `recalibration_requests`, `webhook_events`.
   - **Storage Buckets**:
     - `intake-editais` (privado, armazena os PDFs de editais enviados pelos alunos no formulário).
     - `user-materials` (público para leitura, armazena apostilas, simulados e PDFs do aluno).
   - **Políticas RLS (Row Level Security)**: Cada candidato só pode visualizar e salvar seu próprio progresso e arquivos.
   - **Triggers**: Atualização automática de `updated_at`.

---

## 2. Variáveis de Ambiente no Cloudflare Pages (`crivos-web`)

No painel do Cloudflare Pages (Configurações do Projeto > Variáveis de Ambiente), adicione as seguintes chaves de produção e preview:

| Variável | Descrição | Onde obter |
| :--- | :--- | :--- |
| `MP_ACCESS_TOKEN` | Token de Produção do Mercado Pago | Mercado Pago Developers > Suas integrações |
| `SUPABASE_URL` | URL da API do projeto Supabase | Supabase > Project Settings > API (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta de serviço (Admin) | Supabase > Project Settings > API > `service_role` (secret) |
| `SUPABASE_ANON_KEY` | Chave pública anônima do Supabase | Supabase > Project Settings > API > `anon` (public) |
| `RESEND_API_KEY` | Chave de API para envio de e-mails transacionais | Resend Dashboard > API Keys (`re_...`) |
| `ADMIN_API_KEY` | Senha secreta para publicar painéis calibrados | Qualquer token seguro definido por você (ex: `crivos_adm_secret_2026_xyz`) |

---

## 3. Configuração do Webhook no Mercado Pago

No painel de desenvolvedores do Mercado Pago:
1. Em **Notificações Webhook**:
   - URL de Produção: `https://crivos-web.pages.dev/api/webhook-mp` (ou `https://crivos.me/api/webhook-mp` quando o domínio for apontado)
   - Eventos selecionados: `payment` (Pagamentos).
2. O webhook é idempotente e grava todo evento recebido na tabela `webhook_events`, identificando o pedido via `external_reference`.

---

## 4. Fluxo Operacional de Dois Estágios

### Estágio 1: Pagamento Aprovado (Automático)
1. O usuário preenche o formulário no checkout (`concurso`, `cargo`, `horas semanais`, upload do edital em PDF).
2. O `payment.html` envia esses dados para `/api/save-intake`, salvando o edital em `intake-editais` e gerando o `orderId`.
3. Ao pagar via Pix ou Cartão:
   - O webhook (`/api/webhook-mp`) confirma o pagamento `approved`.
   - Executa `_provision.js`:
     - Cria usuário no **Supabase Auth** com senha tática forte (`CRV-XXXX-XXXX`).
     - Cria o registro na tabela `profiles`.
     - Cria o painel na tabela `user_panels` com status `calibrating` (prazo de 48h).
     - Configura as permissões de módulos conforme o nível (`tatico`, `arsenal` ou `elite`).
     - Envia o **E-mail #1** via Resend com a chave de acesso e link para o painel.
4. O aluno pode entrar no painel imediatamente:
   - Vê a tela tática **"EM CALIBRAÇÃO (ATÉ 48H)"** com contagem regressiva e status dos engenheiros.
   - Pode acessar a aba **12 · Perfil** para alterar sua senha, definir nome e foto.

---

### Estágio 2: Engenharia & Publicação (Equipe CRIVOS)
Quando a engenharia terminar de calibrar o cronograma elástico, textos da bibliografia e flashcards do aluno:

Execute o script CLI a partir do terminal:
```bash
# Exemplo básico:
node scripts/deploy-user-panel.js \
  --email aluno@gmail.com \
  --panel-file ./scripts/template-aluno.json \
  --admin-key sua_admin_key_aqui

# Exemplo com upload automático de pasta de PDFs:
node scripts/deploy-user-panel.js \
  --email aluno@gmail.com \
  --panel-file ./plano_aluno.json \
  --files-dir ./materiais_aluno/ \
  --admin-key sua_admin_key_aqui
```

**O que o script faz:**
1. Envia os PDFs para o Supabase Storage `user-materials/{user_id}/`.
2. Atualiza a tabela `user_panels` para `status = 'ready'` com o JSON completo.
3. Cadastra os links na tabela `user_files`.
4. Dispara o **E-mail #2** para o aluno com assunto `[CRIVOS] SEU PAINEL ESTÁ CALIBRADO E PRONTO`.
5. No próximo acesso do aluno, o painel carrega 100% calibrado com seu cronograma, materiais e textos.

---

## 5. Matriz de Níveis & Bloqueio Tático

| Módulo | TÁTICO | ARSENAL | ELITE |
| :--- | :---: | :---: | :---: |
| 01 · Início & Metas | ✓ Ativo | ✓ Ativo | ✓ Ativo |
| 02 · Cronograma Elástico | ✓ Ativo | ✓ Ativo | ✓ Ativo |
| 03 · Textos & Fichas | ✓ Ativo | ✓ Ativo | ✓ Ativo |
| 04 · Flashcards (SM-2) | 🔒 Bloqueado | ✓ Ativo | ✓ Ativo |
| 05 · Pomodoro Tático | ✓ Ativo | ✓ Ativo | ✓ Ativo |
| 06 · Simulado & Espelho | 🔒 Bloqueado | 🔒 Bloqueado | ✓ Ativo |
| 07 · Arguição Oral | 🔒 Bloqueado | 🔒 Bloqueado | ✓ Ativo / Oculto se não houver |
| 08 · Mapa de Conexões | 🔒 Bloqueado | ✓ Ativo | ✓ Ativo |
| 09 · Links & Materiais | ✓ Ativo | ✓ Ativo | ✓ Ativo |
| 10 · Dicas de Engenharia | ✓ Ativo | ✓ Ativo | ✓ Ativo |
| 11 · Backup de Dados | ✓ Ativo | ✓ Ativo | ✓ Ativo |
| 12 · Perfil & Credenciais | ✓ Ativo | ✓ Ativo | ✓ Ativo |

---

## 6. Modo Demonstração Público

O painel suporta o parâmetro `?demo=1` na URL (`https://app.crivos.me?demo=1` ou `https://crivos-painel.pages.dev?demo=1`).
Nesse modo:
- O sistema ignora a necessidade de login.
- Carrega a demonstração completa do PPGHS/UERJ 2027 com nível ELITE desbloqueado.
- Permite que novos visitantes da landing page experimentem o sistema livremente sem alterar dados na nuvem.
