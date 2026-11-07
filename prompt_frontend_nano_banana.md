# PROMPT --- FRONTEND \| Estúdio de Imagens com Nano Banana

## Objetivo

Criar o frontend responsivo de uma aplicação privada de criação e
composição de imagens com IA, inspirada em ferramentas como Google Flow,
mas com experiência simples e direta. O usuário faz login, envia imagens
de referência, escreve instruções, escolhe a proporção e gera até quatro
imagens.

**Stack obrigatória:** React + Vite + TypeScript, Tailwind CSS,
shadcn/ui e Supabase JS. O backend será implementado com Supabase Auth,
PostgreSQL, Storage e Edge Functions.

## Regras obrigatórias

1.  Inspecione o projeto antes de começar.
2.  Preserve páginas e funcionalidades existentes que não precisem ser
    alteradas.
3.  Não crie telas duplicadas nem dados fictícios apresentados como
    reais.
4.  Mantenha componentes simples, reutilizáveis e fáceis de manter.
5.  Não coloque chaves Google, `service_role` ou segredos no frontend.
6.  Todas as chamadas de geração e gerenciamento de credenciais devem
    passar pelas Edge Functions.
7.  Priorize usabilidade no computador e no celular.

## 1. Identidade visual

Criar um estúdio moderno, minimalista e profissional, com tema escuro
como padrão: - Fundo grafite/preto. - Cards em tons de cinza escuro. -
Texto branco e cinza claro. - Cor de destaque discreta em violeta ou
azul. - Bordas suaves, ícones Lucide e espaçamento consistente. - Evitar
excesso de painéis, menus e informações. - Usar componentes shadcn/ui.

A interface deve lembrar um estúdio criativo profissional, sem copiar
exatamente a identidade visual de outro produto.

## 2. Responsividade

A aplicação deve funcionar muito bem em: - Desktop e notebooks. -
Tablets. - Celulares Android e iPhone.

Requisitos: - Layout fluido, sem rolagem horizontal. - No desktop, usar
navegação lateral compacta e área de trabalho ampla. - No celular, usar
menu compacto ou navegação inferior; não manter sidebar fixa ocupando
espaço. - Botões grandes o suficiente para toque. - Cards e imagens
reorganizados em uma coluna no celular. - Editor visual simplificado no
celular, com blocos empilhados e conexões representadas por
sequência/etapas. - Modais adaptados à largura da tela; em telas
pequenas podem abrir como painéis quase em tela cheia. - Inputs,
seletores e áreas de texto utilizáveis por toque. - Respeitar safe areas
de dispositivos móveis. - Testar larguras de 360 px, 390 px, 768 px,
1024 px e telas desktop.

## 3. Autenticação

Criar tela de login: - Logo/nome do estúdio. - Campo de e-mail. - Campo
de senha com mostrar/ocultar. - Botão Entrar. - Mensagens de validação e
erro. - Estado de carregamento. - Link de recuperação de senha, se
habilitado no Supabase.

Não mostrar opção de cadastro público. Redirecionar usuário não
autenticado para `/login`. Proteger rotas privadas. Implementar logout
com confirmação.

## 4. Navegação principal

Manter poucas opções: - **Estúdio:** criar e executar workflows. -
**Projetos:** listar e abrir projetos salvos. - **Histórico:**
acompanhar gerações e resultados. - **Configurações:** preferências e
gerenciamento das chaves API (somente administrador).

No celular, usar menu compacto ou barra inferior com rótulos curtos.

## 5. Dashboard

Exibir: - Botão principal "Novo projeto". - Projetos recentes. - Últimos
workflows. - Quantidade de imagens geradas, quando esses dados estiverem
disponíveis. - Estado de gerações em andamento. - Mensagem vazia útil
para primeiro acesso.

Evitar gráficos e indicadores desnecessários.

## 6. Estúdio de criação

Esta é a tela principal. Deve ser simples e rápida.

### Entrada de imagens

-   Permitir adicionar até quatro imagens de referência.
-   Upload por seletor de arquivos e, quando suportado, arrastar e
    soltar.
-   Mostrar miniatura, nome e ação para remover/substituir.
-   Validar formatos e tamanho antes do envio.
-   Permitir indicar o papel de cada imagem, por exemplo: "Cenário",
    "Produto", "Pessoa" ou "Referência de estilo".
-   Exemplo de composição: imagem 1 é o cenário; imagem 2 é o produto a
    inserir no cenário.

### Instrução

-   Campo de texto amplo para o prompt principal.
-   Placeholder com exemplo claro.
-   Opcionalmente, permitir instrução individual para cada resultado em
    uma área expansível.
-   Incluir um botão para inserir um exemplo de prompt de composição:
    "Insira o produto da segunda imagem no cenário da primeira. Preserve
    ao máximo formato, cores, textura, logotipo e detalhes do produto.
    Ajuste perspectiva, escala, iluminação e sombras para uma integração
    natural."
-   Não preencher ou alterar o prompt do usuário sem sua ação.

### Proporção da imagem

Oferecer exatamente estas opções iniciais, com botões/segmentos
visíveis: - `9:16` --- Vertical. - `16:9` --- Horizontal. - `1:1` ---
Quadrada.

Mostrar uma pequena prévia visual de cada proporção. A seleção deve
ficar claramente destacada.

### Quantidade

-   Padrão: 4 imagens.
-   Permitir escolher de 1 a 4 imagens.
-   Informar que cada imagem é uma geração independente e pode consumir
    uma chamada da API.

### Geração

-   Botão "Gerar imagens".
-   Desabilitar durante envio inicial para evitar duplicidade.
-   Exibir progresso real com quantidade concluída e pendente.
-   Mostrar estado por resultado: aguardando, gerando, concluído ou
    falhou.
-   Não simular porcentagens ou conclusão.
-   Permitir continuar acompanhando enquanto a tela estiver aberta.
-   Em falha parcial, preservar os resultados concluídos e mostrar
    "Tentar novamente" somente para as imagens que falharam.

## 7. Resultados

Exibir resultados em grade responsiva: - Desktop: até quatro cards em
grade conforme o espaço. - Celular: uma coluna ou duas colunas quando
houver espaço suficiente. - Visualização ampliada da imagem. - Botão
baixar imagem. - Botão regenerar somente aquele resultado. - Mostrar
proporção e data, se disponíveis. - Exibir erros de forma simples e sem
detalhes técnicos sensíveis. - Disponibilizar download individual. Se o
backend implementar ZIP, mostrar também "Baixar todas".

## 8. Projetos e histórico

-   Listar projetos com nome, data e quantidade de workflows.
-   Criar, renomear, abrir e excluir projeto.
-   Listar workflows com miniatura, prompt resumido, proporção, estado e
    data.
-   Filtros simples por status, se necessários.
-   Permitir abrir workflow anterior, consultar resultados e repetir
    geração.
-   Não excluir imagens ou projetos sem confirmação explícita.

## 9. Configurações --- chaves Google API

Criar página simples para administrar credenciais: - Lista com
nome/identificação, projeto Google (se informado), prioridade, estado e
última utilização. - Botão "Adicionar chave". - Formulário com rótulo,
chave API, referência do projeto opcional, prioridade e ativação. -
Mostrar chave mascarada após salvar; nunca buscar ou exibir a chave
completa novamente. - Ações: testar, ativar/desativar, editar metadados,
alterar prioridade e excluir. - Indicadores: ativa, em espera/cooldown,
inválida ou desativada. - Mostrar aviso de que chaves do mesmo projeto
compartilham cotas e que projetos diferentes podem ter cotas
independentes, conforme as regras do Google. - Exibir mensagens de
resultado retornadas pelo backend, sem inventar consumo ou limites.

A chave deve ser enviada diretamente à Edge Function por HTTPS. Nunca
salvar em localStorage, sessionStorage, estado persistente do navegador,
analytics ou logs do frontend.

## 10. Modais de confirmação

**Obrigatório:** usar modal de confirmação para ações que alterem ou
excluam dados, incluindo: - Sair da conta. - Excluir projeto. - Excluir
workflow. - Remover imagem de referência já enviada. - Excluir resultado
salvo. - Excluir chave API. - Desativar chave API. - Descartar
alterações não salvas. - Substituir imagem ou configuração quando isso
causar perda de dados.

Os modais devem: - Informar claramente o que será alterado ou
excluído. - Identificar o item afetado. - Ter botões "Cancelar" e uma
ação explícita, como "Excluir" ou "Confirmar". - Usar estilo visual de
alerta nas ações destrutivas. - Não executar a ação ao clicar fora do
modal ou pressionar Escape; fechar sem confirmar. - Exibir loading
durante a operação e impedir duplo clique. - Mostrar sucesso ou erro
somente após resposta do backend.

Para alterações simples em campos ainda não salvos, não abrir modal a
cada digitação. Confirmar ao salvar quando a alteração for relevante ou
ao descartar mudanças.

## 11. Estados e acessibilidade

-   Criar estados de carregamento, vazio, sucesso e erro.
-   Usar skeletons quando apropriado.
-   Mensagens de erro em português claro.
-   Labels associados aos campos.
-   Navegação por teclado e foco visível.
-   Contraste adequado.
-   Botões com rótulos acessíveis.
-   Não depender apenas de cor para indicar status.

## 12. Integração Supabase

-   Usar variáveis de ambiente do frontend somente para URL e
    anon/publishable key do Supabase.
-   Autenticação pelo Supabase Auth.
-   Consultar projetos, workflows e histórico com a sessão atual.
-   Upload para buckets privados usando sessão e policies.
-   Gerar URLs assinadas para exibir imagens privadas.
-   Invocar Edge Functions para gerar imagens e administrar chaves.
-   Nunca chamar a API Gemini diretamente do navegador.
-   Tratar expiração de sessão e erros de autorização.
-   Não confiar em IDs ou permissões enviados pelo cliente.

## 13. Componentes sugeridos

Organizar componentes reutilizáveis: - `AppLayout` -
`ResponsiveNavigation` - `LoginPage` - `DashboardPage` - `StudioPage` -
`ImageUploader` - `ReferenceImageCard` - `PromptEditor` -
`AspectRatioSelector` - `GenerationProgress` - `GeneratedImageCard` -
`ProjectList` - `WorkflowHistory` - `ApiCredentialsPage` -
`ApiCredentialForm` - `ConfirmDialog` - `EmptyState` - `LoadingState`

Usar shadcn/ui para Dialog, AlertDialog, Button, Input, Textarea,
Select, Tabs, Card, DropdownMenu, Tooltip, Skeleton, Toast/Sonner e
componentes equivalentes quando necessário.

## 14. Critérios de aceite

Considerar concluído somente quando: 1. Login e rotas privadas
funcionarem. 2. Interface se adaptar a desktop, tablet e celular sem
rolagem horizontal. 3. Upload de até quatro imagens funcionar. 4. As
três proporções `9:16`, `16:9` e `1:1` puderem ser selecionadas. 5. O
usuário conseguir escrever prompt e solicitar de 1 a 4 resultados. 6. O
progresso refletir o estado real do backend. 7. Resultados puderem ser
visualizados e baixados. 8. Histórico e projetos forem carregados do
Supabase. 9. Cadastro e gerenciamento de chaves ocorrerem com segurança
via Edge Functions. 10. Modais de confirmação existirem nas ações de
alteração e exclusão relevantes. 11. Falhas parciais permitirem repetir
somente os resultados que falharam. 12. Nenhuma chave secreta estiver
presente no bundle ou código do frontend.

Ao concluir, informe arquivos criados/alterados, rotas, componentes,
variáveis de ambiente necessárias e testes executados. Não faça mudanças
fora do escopo.
