# PROMPT --- BACKEND \| Estúdio de Imagens com Nano Banana

## Objetivo

Implemente o backend de uma aplicação web privada para criação e
composição de imagens com IA. O usuário entra por login, envia imagens
de referência, define instruções e gera até quatro imagens de saída
usando a API do Google Gemini (Nano Banana).

**Stack obrigatória:** Supabase Auth, PostgreSQL, Storage e Edge
Functions. O frontend será React + Vite + TypeScript, mas este documento
trata somente do backend.

## Regras de implementação

1.  Antes de criar ou alterar qualquer coisa, inspecione o projeto e o
    Supabase já conectado.
2.  Não recrie tabelas, políticas, funções ou recursos que já existam
    sem necessidade.
3.  Não altere funcionalidades não relacionadas.
4.  Use migrations SQL versionadas.
5.  Todas as operações privilegiadas e chamadas ao Google devem ocorrer
    no servidor, nunca diretamente no navegador.
6.  Não exponha chaves de API, service-role key ou segredos em
    respostas, logs ou payloads enviados ao frontend.
7.  Entregue implementação funcional, validações, tratamento de erros e
    instruções de configuração. Não deixe dados falsos como se fossem
    resultados reais.

## 1. Autenticação e acesso privado

-   Usar Supabase Auth com e-mail e senha.
-   A aplicação será inicialmente de uso privado, por um único
    administrador.
-   Não permitir cadastro público.
-   Criar/verificar um perfil de administrador associado ao
    `auth.users`.
-   Proteger tabelas, Storage e Edge Functions com autenticação.
-   Validar o usuário no servidor em todas as operações protegidas.
-   Aplicar RLS em todas as tabelas acessíveis pelo cliente.
-   O frontend nunca deve receber a chave `service_role`.

## 2. Banco de dados

Criar migrations para as tabelas abaixo, ajustando nomes se o projeto já
possuir convenção equivalente.

### `profiles`

-   `id` UUID, PK e referência a `auth.users.id`.
-   `email` texto.
-   `role` texto, inicialmente `admin`.
-   `created_at`, `updated_at`.

### `api_credentials`

Armazenar várias credenciais Google e permitir alternância automática. -
`id` UUID, PK. - `label` texto. - `encrypted_api_key` texto: somente
valor criptografado no servidor. - `google_project_ref` texto opcional,
identificador informativo do projeto Google. - `priority` inteiro. -
`enabled` boolean. - `status` texto: `active`, `cooldown`, `invalid` ou
`disabled`. - `last_used_at` timestamp opcional. - `cooldown_until`
timestamp opcional. - `last_error_code` texto opcional. - `created_at`,
`updated_at`.

Nunca retornar `encrypted_api_key` em consultas ao frontend. Criar uma
função/Edge Function administrativa para cadastrar, testar, ativar,
desativar e excluir credenciais. Mostrar a chave mascarada após o
cadastro; não há necessidade de recuperá-la em texto puro.

**Segurança de credenciais:** implementar criptografia autenticada no
servidor (por exemplo, AES-256-GCM) antes de gravar a chave. A chave
mestra de criptografia deve existir somente como Supabase Edge Function
Secret, nunca no banco ou frontend. Não registrar chaves em logs. Se a
criptografia segura não puder ser implementada corretamente, não salvar
credenciais em texto puro: interromper essa parte e documentar a
configuração necessária.

### `projects`

-   `id` UUID, PK.
-   `user_id` UUID, referência ao usuário.
-   `name` texto.
-   `description` texto opcional.
-   `created_at`, `updated_at`.

### `workflows`

-   `id` UUID, PK.
-   `project_id` UUID, referência a `projects`.
-   `user_id` UUID.
-   `name` texto.
-   `prompt` texto.
-   `aspect_ratio` texto limitado a `9:16`, `16:9` ou `1:1`.
-   `output_count` inteiro, padrão 4 e máximo 4.
-   `status` texto: `draft`, `queued`, `processing`, `completed`,
    `partial`, `failed`.
-   `created_at`, `updated_at`.

### `workflow_images`

-   `id` UUID, PK.
-   `workflow_id` UUID, referência a `workflows`.
-   `user_id` UUID.
-   `role` texto: `reference` ou `result`.
-   `position` inteiro.
-   `storage_path` texto.
-   `mime_type` texto.
-   `file_size` bigint.
-   `prompt` texto opcional, para instrução individual de resultado.
-   `status` texto opcional para resultado: `queued`, `processing`,
    `completed`, `failed`.
-   `error_message` texto opcional, sem dados sensíveis.
-   `created_at`.

### `generation_jobs`

-   `id` UUID, PK.
-   `workflow_id` UUID.
-   `user_id` UUID.
-   `status` texto: `queued`, `processing`, `completed`, `partial`,
    `failed`.
-   `requested_count` inteiro.
-   `completed_count` inteiro, padrão 0.
-   `failed_count` inteiro, padrão 0.
-   `attempt_count` inteiro, padrão 0.
-   `error_summary` texto opcional.
-   `started_at`, `finished_at`, `created_at`.

### `api_usage_logs`

-   `id` UUID, PK.
-   `credential_id` UUID opcional.
-   `job_id` UUID opcional.
-   `model` texto.
-   `operation` texto.
-   `http_status` inteiro opcional.
-   `success` boolean.
-   `latency_ms` inteiro opcional.
-   `error_code` texto opcional.
-   `created_at`.

Não registrar prompt completo, imagem, chave, token ou dados pessoais
desnecessários nos logs.

## 3. Supabase Storage

Criar buckets privados: - `image-references`: imagens originais
enviadas. - `image-results`: imagens geradas.

Regras: - Acesso privado, com RLS/policies que restrinjam arquivos ao
usuário proprietário. - Validar MIME type e tamanho máximo configurável
no servidor. - Aceitar formatos de imagem comuns: JPEG, PNG e WebP. -
Gerar URLs assinadas com validade curta para visualização e download. -
Não tornar os buckets públicos. - Excluir arquivos associados ao
workflow quando o usuário confirmar a exclusão do workflow.

## 4. Edge Functions

Implementar funções com validação de autenticação e payload:

### `manage-api-credentials`

-   Cadastrar chave Google.
-   Criptografar antes de persistir.
-   Listar apenas metadados e chave mascarada.
-   Atualizar rótulo, prioridade e estado.
-   Testar credencial sem revelar a chave.
-   Excluir credencial após confirmação no frontend.
-   Nunca retornar segredo em resposta.

### `generate-images`

Receber: - `workflow_id`. - Imagens de referência já armazenadas no
Storage. - Prompt principal. - Prompt individual opcional por saída. -
Proporção selecionada: `9:16`, `16:9` ou `1:1`. - Quantidade de saídas,
de 1 a 4 (padrão 4).

Fluxo: 1. Validar sessão, propriedade do workflow, quantidade,
proporção, imagens e limites. 2. Criar job e marcar workflow como
`processing`. 3. Buscar uma credencial habilitada e elegível,
respeitando prioridade e cooldown. 4. Descriptografar a credencial
somente em memória no servidor. 5. Chamar a API oficial do Google Gemini
usando o modelo de geração de imagens configurado. Não presumir que toda
chave/modelo suporta os mesmos recursos; validar a resposta e documentar
o modelo escolhido. 6. Para obter quatro resultados, executar até quatro
gerações independentes. Não presumir que uma única chamada retornará
exatamente quatro imagens. 7. Salvar cada resultado no bucket privado
`image-results` e registrar cada saída em `workflow_images`. 8.
Atualizar progresso e estado do job/workflow após cada saída. 9.
Retornar identificadores e estados, nunca segredos.

Permitir prompts individuais por saída. Se não forem fornecidos, usar o
prompt principal para todas as saídas, podendo acrescentar uma pequena
variação de enquadramento somente se o usuário solicitar.

### `get-generation-status`

Retornar estado do job, contagem concluída/falha e resultados
disponíveis, usando URLs assinadas.

### `delete-workflow`

Validar propriedade, excluir arquivos do Storage e registros
relacionados de forma consistente. Se houver falha parcial, registrar
estado recuperável e não deixar o workflow indicando exclusão completa
sem que ela tenha sido concluída.

## 5. Alternância automática de chaves

Implementar um seletor centralizado de credenciais: - Escolher a
credencial habilitada de maior prioridade que não esteja em cooldown nem
inválida. - Em erro de limite temporário/cota (por exemplo HTTP 429 ou
código equivalente documentado), colocar a credencial em cooldown e
tentar a próxima credencial elegível. - Em credencial
inválida/autorização negada (por exemplo HTTP 401/403 quando confirmado
como problema da chave), marcar como `invalid` ou exigir validação
administrativa; não repetir indefinidamente. - Em erro de
conteúdo/prompt/imagem, não trocar de chave automaticamente como se
fosse limite de cota. - Em falha de rede/servidor, usar retentativas
limitadas com backoff exponencial e jitter. - Definir máximo de
tentativas por saída e impedir loops. - Manter o estado de cada uma das
quatro saídas; se duas forem concluídas e uma falhar, preservar as
concluídas e permitir repetir somente as falhas. - Impedir que duas
execuções concorrentes escolham a mesma credencial de forma
descontrolada: usar transação/lock ou mecanismo atômico no banco para
reservar credencial. - Nunca prometer continuidade se todas as
credenciais estiverem indisponíveis; informar claramente que não há
outra credencial elegível.

**Importante sobre cotas Google:** várias API keys do mesmo projeto
Google normalmente compartilham as cotas do projeto. O cadastro de
várias chaves não multiplica a capacidade. Para obter cotas
independentes, as credenciais precisam pertencer a projetos Google
distintos, sujeitos aos limites e termos do Google. Não tentar contornar
limites ou políticas do provedor.

## 6. Composição de imagens

A API deve aceitar uma ou mais imagens de referência. Dar suporte
especial ao caso: - Imagem A: cenário. - Imagem B: produto. - Instrução:
inserir o produto no cenário, preservando ao máximo identidade, formato,
cor, textura, logotipo e detalhes do produto; adaptar perspectiva,
escala, iluminação e sombras para integração natural.

Não garantir preservação perfeita de todos os detalhes: informar que
modelos generativos podem alterar elementos. Permitir ao usuário revisar
e regenerar.

## 7. Proporções de saída

Suportar inicialmente somente estas opções no produto: - `9:16` ---
vertical. - `16:9` --- horizontal. - `1:1` --- quadrada.

Validar a opção no backend e enviar o parâmetro compatível com o modelo
Gemini selecionado. Se o modelo não aceitar a proporção solicitada,
retornar erro compreensível; não fingir que a imagem tem a proporção
pedida.

## 8. Segurança, RLS e validações

-   RLS habilitada em todas as tabelas.
-   Usuário só acessa seus próprios projetos, workflows, imagens e jobs.
-   Somente administrador gerencia credenciais e configurações globais.
-   Validar todos os IDs, tipos, tamanhos, prompts e estados no
    servidor.
-   Proteger contra chamadas repetidas acidentais com idempotency key ou
    controle de job ativo.
-   Aplicar limites de tamanho, timeout e rate limiting.
-   Sanitizar mensagens de erro.
-   Não confiar em `user_id` enviado pelo navegador: derivar da sessão
    autenticada.
-   Não usar `service_role` no frontend.

## 9. Entrega

Ao concluir: 1. Criar migrations SQL. 2. Criar policies RLS. 3. Criar
buckets e policies de Storage. 4. Implementar e documentar Edge
Functions. 5. Incluir arquivo de exemplo de variáveis/secrets sem
valores reais. 6. Documentar como configurar Gemini API, chave mestra de
criptografia e deploy das Edge Functions. 7. Explicar como criar o
primeiro usuário administrador sem habilitar cadastro público. 8. Testar
autenticação, upload, geração, fallback de chave, geração parcial,
repetição de falhas e exclusão. 9. Listar arquivos criados/alterados e
passos manuais restantes.

Não inventar sucesso: se uma API, modelo ou recurso não estiver
configurado, apresentar o erro real e a configuração necessária.
