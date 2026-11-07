# Backend - Estúdio de Imagens com Nano Banana (Google Gemini)

Backend completo e pronto para produção utilizando **Supabase (PostgreSQL, Auth, Storage, Edge Functions)** e **Google Gemini / Imagen 3 (Nano Banana)**.

---

## 📁 Estrutura de Arquivos Criados

```
supabase/
├── migrations/
│   ├── 20261107000001_initial_schema.sql     # Tabelas, triggers, índices e função de leasing atômico
│   ├── 20261107000002_rls_policies.sql       # RLS estrito e view mascarada para credenciais
│   └── 20261107000003_storage_buckets.sql    # Buckets privados (image-references, image-results) e RLS
└── functions/
    ├── _shared/
    │   ├── crypto.ts                         # Criptografia AES-256-GCM com Web Crypto API
    │   ├── supabaseClient.ts                 # Utilitários de Auth e clientes autenticados
    │   └── gemini.ts                         # Cliente Google Gemini / Imagen 3 com classificação de erros
    ├── manage-api-credentials/index.ts       # Gestão de credenciais (CRUD, mascaramento, teste)
    ├── generate-images/index.ts              # Orquestrador de geração com rotação de chaves e composição
    ├── get-generation-status/index.ts        # Consulta de status e geração de URLs assinadas
    └── delete-workflow/index.ts              # Exclusão segura e consistente com limpeza do Storage
```

---

## 🔐 1. Configuração de Segredos (Edge Functions Secrets)

As Edge Functions requerem variáveis e segredos configurados. No painel do Supabase (**Project Settings -> Edge Functions -> Secrets**) ou via CLI:

```bash
# Definir a chave mestra de criptografia (mínimo 32 caracteres de alta entropia)
supabase secrets set MASTER_ENCRYPTION_KEY="sua-chave-mestra-aleatoria-com-pelo-menos-32-caracteres"
```

> **Aviso de Segurança**: `MASTER_ENCRYPTION_KEY` nunca é exposta no banco de dados nem no frontend. As chaves de API do Google são criptografadas com AES-256-GCM antes de serem gravadas no PostgreSQL.

---

## 👤 2. Criação do Primeiro Usuário Administrador (Sem Cadastro Público)

Como o sistema é privado, o cadastro público deve permanecer desabilitado:
1. No Supabase Dashboard, acerte as opções de autenticação:
   - Vá em **Authentication** -> **Providers** -> **Email**.
   - Desmarque a opção **"Enable Signups"** (permite apenas usuários convidados/criados pelo administrador).
2. Para criar o primeiro usuário administrador:
   - Acesse **Authentication** -> **Users** -> **Add User** -> **Create User**.
   - Digite o e-mail e uma senha forte.
   - O trigger SQL `on_auth_user_created` cadastrará automaticamente o usuário na tabela `public.profiles` com papel `role = 'admin'`.

---

## 🗄️ 3. Execução das Migrations

Se estiver usando o Supabase CLI:
```bash
supabase db push
# ou aplique as migrations no SQL Editor do Supabase Dashboard na ordem:
# 1. 20261107000001_initial_schema.sql
# 2. 20261107000002_rls_policies.sql
# 3. 20261107000003_storage_buckets.sql
```

---

## 🚀 4. Deploy das Edge Functions

Execute no terminal:

```bash
supabase functions deploy manage-api-credentials
supabase functions deploy generate-images
supabase functions deploy get-generation-status
supabase functions deploy delete-workflow
```

---

## 🔄 5. Alternância Automática de Chaves e Tratamento de Cotas

O backend implementa o seletor centralizado com função PostgreSQL atômica (`lease_gemini_credential`):
- **Isolamento de concorrência:** Utiliza `FOR UPDATE SKIP LOCKED` para garantir que duas requisições paralelas nunca entrem em conflito.
- **Detecção de limite de cota (HTTP 429):** A credencial é colocada em `cooldown` por 10 minutos e a próxima chave habilitada de maior prioridade assume a requisição imediatamente.
- **Detecção de chave inválida (HTTP 401/403):** A credencial é marcada como `invalid` com código de erro gravado, sem loop infinito.
- **Retry granular por posição:** Se uma saída falhar em um lote de 4, o backend preserva as saídas concluídas e permite reenviar apenas as falhas com o parâmetro `retry_failed_only: true`.

> **Sobre cotas Google:** API Keys do mesmo projeto Google compartilham a mesma cota. Para expandir a resiliência efetiva, cadastre credenciais originárias de projetos Google distintos.

---

## 🖼️ 6. Composição de Imagens e Proporções

- **Composição:** Suporte à inserção de produto em cenário preservando logos, texturas e integrando iluminação e sombras via modelo `imagen-3.0-generate-002`.
- **Proporções suportadas:** `9:16`, `16:9` e `1:1`. Validado estritamente no backend antes da chamada à API.

