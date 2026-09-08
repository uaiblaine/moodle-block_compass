# block_compass — Plano de implementação

> Documento de handoff para o Claude Code. Colocar na raiz do repositório como `PLAN.md`
> ao lado de um `CLAUDE.md` (convenções). O agente deve ler ambos antes de qualquer edição.
> Versão 2 — inclui novas inscrições e a estratégia de desempenho em escala (§6).

## 1. Problema

O `block_myoverview` organiza cursos por **tempo** (início/fim). Na Fundaseg a maioria dos
cursos não tem data de término nem regra de conclusão, então a classificação temporal
degenera: tudo cai em "em andamento", o aluno escolhe "todos" com 96 cards por página e
procura visualmente. Custo alto para o servidor (o web service de timeline carrega curso,
imagem, sumário e conclusão por card) e para o navegador, e carga cognitiva alta.

O aluno pensa por **relevância** ("o que eu estava fazendo", "o que me interessa", "o que
acabou de chegar") e por **identidade visual**, não por datas.

## 2. Proposta — bloco em três andares

| Andar | Conteúdo | Carga | Quando carrega |
|---|---|---|---|
| 1 — Atenção | Continuar (últimos acessos) · Novas inscrições (inscrito há ≤ N dias, nunca acessado) · Favoritos · Pendências (v2) | cards completos: imagem, progresso, botão | primeiro paint, um único web service |
| 2 — Fronteira | card fantasma "+N outros cursos" | só a contagem | primeiro paint |
| 3 — Exploração | lista compacta agrupada por categoria, índice lateral, filtro instantâneo, virtualização, Dormentes recolhidos | inventário leve (id, nome, categoria, último acesso, inscrição, favorito) | ao clicar no fantasma, ao digitar na busca ou ao rolar |

Wireframe: `docs/wireframe-meus-cursos-3-andares.html`.

**Regra de exclusividade**: cada curso aparece em uma única faixa do andar 1, prioridade
Continuar › Novo › Favorito. Novo + favorito fica em Novo com a estrela marcada.
*(Superada em 2026-09-07 pela ADR-009, decisão 1, só para a faixa de favoritos: ela lista
todos os favoritos, repetindo os que já estão em Continuar ou Novo; Continuar e Novo seguem
exclusivas entre si.)*

## 3. Princípios (herdados do block_dimensions)

1. **Sem tabelas próprias.** Favoritos via `core_favourites`, cache via MUC, preferências
   via `user_preferences`. Se precisar persistir algo além disso, parar e discutir.
2. **Servidor entrega casca, navegador renderiza.** PHP envia labels e configuração; dados
   vêm por AJAX; cards e linhas renderizam client-side com Mustache (`core/templates`).
3. **Pagar só pelo que aparece.** Metadados caros (imagem, progresso) só para itens visíveis.
   Contar é barato; renderizar é caro.
4. **O andar 1 nunca depende do inventário completo.** Ver §6.1.
5. **Filtrar nunca re-renderiza.** Busca e filtros alternam visibilidade de nós já no DOM.
6. **Core primeiro.** `core_course`, `core_completion`, `core_favourites`, `core_user`.
   SQL próprio só em `classes/local/`, com índice existente e limite explícito.
7. **WCAG 2.1 AA**, Boost, `prefers-reduced-motion`, live regions.
8. **Escala é requisito, não otimização.** Todo endpoint tem orçamento de consultas e de
   tempo (§6.6) verificado em teste automatizado.

## 4. Fontes de dados

| Dado | Origem | Observação |
|---|---|---|
| Inscrições do usuário | `{user_enrolments}` ⋈ `{enrol}` ⋈ `{course}` (índices `userid`, `enrolid`) | consulta própria com campos mínimos; `enrol_get_my_courses()` faz checagens por curso caras demais para o inventário |
| Último acesso por curso | `{user_lastaccess}` (índice `userid,courseid`) | base de Continuar e de Dormentes |
| Nova inscrição | `{user_enrolments}.timecreated` sem linha em `{user_lastaccess}` | método via `{enrol}.enrol`; fim via `{enrol}.enrolenddate` / `{user_enrolments}.timeend` |
| Favoritos | `core_favourites`, componente `block_compass`, itemtype `course`, contexto do usuário | espelhar `block_dimensions_toggle_favourite` |
| Progresso | `core_completion\progress::get_course_progress_percentage()` | só andar 1 e linhas visíveis do andar 3, sempre via cache `details` |
| Imagem do curso | `core_course_list_element::get_course_overviewfiles()` | idem; cacheada na camada de curso (§6.2) |
| Categoria | `core_course_category` | eixo do andar 3 |
| Pendências | action events do `core_calendar` (mesma fonte do `block_timeline`) | v2, atrás de setting |
| Ocultos pelo aluno | `user_preferences` `block_myoverview_hidden_course_*` | respeitar e reutilizar para "arquivar" |

## 5. Arquitetura

```
blocks/compass/
├── block_compass.php            # casca: config + labels, sem dados
├── classes/
│   ├── external/
│   │   ├── get_attention.php    # andar 1 + contagem do andar 2
│   │   ├── get_inventory.php    # andar 3: lista leve; por categoria/cursor no modo degradado
│   │   ├── get_card_details.php # imagem + progresso em lote (ids visíveis)
│   │   ├── toggle_favourite.php
│   │   └── set_hidden.php       # arquivar/desarquivar (user_preference)
│   ├── local/
│   │   ├── attention.php        # consultas limitadas do andar 1
│   │   ├── inventory.php        # inventário do usuário (camada usuário)
│   │   ├── course_meta.php      # nome/categoria/imagem/visibilidade (camada curso)
│   │   ├── dormancy.php
│   │   └── budget.php           # contador de consultas/tempo usado nos testes
│   ├── task/warm_active_users.php   # opcional, desligado por padrão (§6.4)
│   ├── output/, privacy/provider.php
├── amd/src/ (main, attention, explore, filter, favourites, repository)
├── templates/ (block, card, card_new, ghost, group, row, skeleton, index)
├── db/services.php, access.php, caches.php, tasks.php, events.php
├── lang/en, lang/pt_br · settings.php · tests/
```

## 6. Desempenho e escala

Cenário de dimensionamento: **1 milhão de usuários, `{user_enrolments}` na casa de 20 GB,
milhares de acessos simultâneos ao Painel**. As decisões abaixo são obrigatórias; o que está
marcado como *ADR* deve ser registrado em `docs/adr/` antes da implementação da fase.

### 6.1 Primeiro paint sem inventário

O andar 1 é resolvido por consultas **limitadas e indexadas**, nunca varrendo todas as
inscrições do usuário:

- Continuar: `{user_lastaccess}` do usuário, `ORDER BY timeaccess DESC`, join com inscrição
  ativa e curso visível, `LIMIT attention_max + margem` (margem descarta ocultos/concluídos).
- Novas inscrições: `{user_enrolments}` do usuário, `timecreated > now − new_days`, anti-join
  `{user_lastaccess}`, `ORDER BY timecreated DESC LIMIT attention_max`.
- Favoritos: lista de ids do `core_favourites` (já indexado por usuário) → busca dos cursos por
  id.
- Contagem do fantasma: `COUNT(*)` de inscrições ativas do usuário (índice `userid`).

Orçamento: **≤ 6 consultas ao banco, todas com `LIMIT` ou `COUNT` indexado.** Progresso e
imagem só para os ≤ 15 cards resultantes, via cache `details`.

### 6.2 Cache em duas camadas (*ADR-001*)

Invalidar o cache de cada usuário quando um curso muda é inviável: um `course_updated` num
curso com 100 mil inscritos invalidaria 100 mil entradas.

| Camada | Chave | Conteúdo | Invalidação |
|---|---|---|---|
| `coursemeta` (application) | `courseid` | nome, categoria, visibilidade, imagem (URL), `enablecompletion` | eventos `course_updated`, `course_category_updated`, `course_deleted`; compartilhada por todos os usuários |
| `inventory` (application) | `userid` | array de `[courseid, timecreated, timeaccess, enrolmethod, timeend]` — **sem** dados de curso | validação por carimbo (§6.3); TTL de segurança 24 h |
| `details` (application) | `userid:courseid` | percentual de progresso | evento `course_completion_updated` / `course_module_completion_updated` do próprio usuário; TTL 1 h |

Store recomendado: **Redis** para os três (configurar em MUC; documentar no README).
`inventory` de um usuário com 2 000 inscrições ≈ 60 KB serializado; aceitável.

### 6.3 Validação por carimbo em vez de invalidação por evento (*ADR-002*)

Antes de usar `inventory` cacheado, executar uma única consulta barata:
`SELECT COUNT(*), MAX(timemodified) FROM {user_enrolments} WHERE userid = ?`.
Se coincidir com o carimbo guardado, o cache é válido; senão, recomputar. Custo: um índice
scan por usuário, independente do tamanho da tabela. Elimina observers de inscrição e o
risco de cache obsoleto após importação em lote.

### 6.4 Pré-aquecimento: opcional, seletivo, orçado (*ADR-003*)

Não pré-aquecer 1 milhão de usuários — a maioria nunca abrirá o Painel no dia. Estratégia:

- **Padrão: aquecimento sob demanda** (lazy). O primeiro acesso do dia paga o custo; os
  seguintes leem cache.
- **Opcional** (`enable_prewarm`, desligado): tarefa agendada `warm_active_users` fora do
  horário de pico, restrita a usuários com `{user}.lastaccess` nos últimos `prewarm_days`
  (padrão 7), processando em lotes com **orçamento de tempo** (`prewarm_budget_seconds`)
  e retomando de onde parou na próxima execução. Aquece `coursemeta` dos cursos desses
  usuários e o `inventory` deles. Nunca aquece `details`.
- Aquecer `coursemeta` é barato e vale sempre: `course_updated` já recomputa a entrada no
  observer, então a camada de curso se mantém quente naturalmente.

### 6.5 Modo degradado para usuários com muitas inscrições (*ADR-004*)

Acima de `inventory_max` inscrições (padrão 250), o andar 3 **não** carrega o inventário
completo no navegador:

- `get_inventory` responde apenas os cabeçalhos de grupo com contagens (`GROUP BY category`,
  uma consulta).
- Cada grupo aberto busca suas linhas por cursor (`LIMIT 100`, `after=courseid`).
- A busca passa a ser server-side (`LIKE` indexado por `fullname`/`shortname`, com debounce
  maior, 300 ms).
- O cliente decide o modo pelo campo `mode: full|paged` da resposta; a UI é a mesma.

### 6.6 Orçamentos e testes

| Endpoint | Consultas | Tempo servidor (p95, cache frio) | Payload |
|---|---|---|---|
| `get_attention` | ≤ 6 | 150 ms | ≤ 20 KB |
| `get_inventory` (500 inscrições) | ≤ 3 | 300 ms | ≤ 40 KB |
| `get_inventory` (modo degradado, cabeçalhos) | ≤ 2 | 150 ms | ≤ 5 KB |
| `get_card_details` (24 ids) | ≤ 1 + completion | 200 ms | ≤ 10 KB |

- `classes/local/budget.php` conta consultas via `$DB->perf_get_reads()` e falha o PHPUnit
  se o orçamento for estourado.
- Fixture de carga: gerador próprio (`tests/generator`) criando 5 000 usuários × 300
  inscrições + 50 usuários × 3 000, cursos em 6 categorias; usar `tool_generator` para os
  cursos. Rodar `EXPLAIN ANALYZE` no PostgreSQL das consultas de §6.1 e anexar ao ADR.
- Teste de concorrência (k6 ou `ab`) contra `get_attention` com 200 usuários simultâneos
  no ambiente de homologação GCP antes da Fase 2 ser considerada pronta.

### 6.7 O que não fazer

- Não chamar `enrol_get_my_courses()` nem o web service de timeline no caminho quente.
- Não carregar `course_modinfo` para nenhum curso fora do cálculo de progresso.
- Não iterar sobre cursos em PHP para checar visibilidade — resolver no SQL
  (`course.visible = 1` ou capability `moodle/course:viewhiddencourses` checada uma vez).
- Não usar cache de sessão para inventário (não sobrevive a múltiplos nós e infla a sessão).
- Não invalidar caches de usuário em eventos de curso.

## 7. Regras de negócio

- **Continuar**: até `attention_max` (padrão 5) por `timeaccess desc`, excluindo ocultos e
  concluídos (quando há conclusão). Empate por nome.
- **Novo**: inscrito há ≤ `new_days` (padrão 30) e sem `user_lastaccess`. Card com selo
  "Novo", botão "Começar", data e método da inscrição, prazo ou fim de inscrição se houver.
  Sai da faixa no primeiro acesso (vira Continuar) ou após `new_days` (vai ao andar 3, com
  selo enquanto nunca acessado). Mais de `attention_max` novos → fantasma "+N novos" próprio.
- **Favoritos**: todos, por nome. Fantasma do andar 2 mostra `total − exibidos no andar 1`.
- **Dormente**: sem acesso há `dormant_months` (padrão 12), ou nunca acessado e inscrito há
  mais de `dormant_months`. Recolhido; "Arquivar todos" grava preferência de oculto em lote
  após confirmação.
- **Agrupamento do andar 3**: categoria de nível `group_depth` (padrão 1); grupos fechados
  recebem só cabeçalho + contagem.
- **Busca**: client-side sobre o inventário carregado; no modo degradado, server-side.
- **Virtualização**: apenas linhas na viewport (+ buffer); `get_card_details` em lotes ≤ 24.

## 8. Settings

`attention_max`, `new_days`, `dormant_months`, `group_depth`, `inventory_max`,
`enable_favourites`, `enable_pending` *(desde a ADR-009: solicitações de inscrição do
enrol_apply aguardando aprovação, não os action events do calendário da Fase 6 — que, se um dia
for construída, precisa de outra chave)*, `enable_prewarm`, `prewarm_days`,
`prewarm_budget_seconds`, `default_view` (list|cards), `enable_search`, `hide_block_title`,
`show_index`.

## 9. Fases de entrega

### Fase 0 — Esqueleto
Scaffold a partir do block_dimensions (CI, phpcs, stylelint, Privacy API, lang packs), casca
do bloco, `main.js` mínimo, `db/caches.php` com as três caches declaradas, `budget.php`.
**Aceite**: instala, aparece no Painel, `moodle-plugin-ci` verde.

### Fase 1 — Andar 1 + fantasma
`attention.php` (§6.1), `coursemeta` + `details` (§6.2), `get_attention`, cards
(incl. `card_new`), favoritos, fantasma com contagem. ADR-001 escrito.
**Aceite**: primeiro paint com 1 chamada Ajax e ≤ 6 consultas (teste de orçamento);
favoritar sem reload; novo → continuar após primeiro acesso; contagem correta.

### Fase 2 — Andar 3, inventário
`inventory.php` com validação por carimbo (§6.3), `get_inventory` modo `full`, `explore.js`,
grupos, índice, busca client-side. ADR-002 escrito. Fixture de carga criada.
**Aceite**: 500 inscrições → inventário < 300 ms p95 cache frio; busca sem Ajax após o
primeiro carregamento; `EXPLAIN ANALYZE` anexado.

### Fase 3 — Escala
Modo degradado `paged` (§6.5), busca server-side, tarefa `warm_active_users` opcional
(§6.4), teste de concorrência. ADR-003 e ADR-004 escritos.
**Aceite**: usuário com 3 000 inscrições abre o andar 3 em < 400 ms sem transferir o
inventário; 200 usuários simultâneos em `get_attention` sem p95 > 300 ms na homologação.

### Fase 4 — Lazy details + virtualização
`get_card_details` em lote, IntersectionObserver, skeletons, alternância lista/cards.
**Aceite**: nenhuma imagem/progresso carregada para linhas fora da viewport.

### Fase 5 — Dormentes e arquivamento
`dormancy.php`, faixa recolhida, `set_hidden` em lote, compatível com ocultos do
`block_myoverview`.
**Aceite**: arquivar no Compass oculta no Meus cursos nativo e vice-versa.

### Fase 6 — Pendências (v2, opcional)
Action events do calendário.

### Fase 7 — Acessibilidade, docs, publicação
Auditoria WCAG, Behat, README bilíngue com seção de dimensionamento e configuração de
Redis, CHANGELOG, submissão ao diretório.

## 10. Não-objetivos (v1)

- Substituir o `block_myoverview` (convive; admin pode removê-lo do layout padrão).
- Visão de gestor, relatórios, cursos de outros usuários.
- Tags/custom fields de curso como filtro (v2). *(Campos customizados dos tipos lista de
  seleção e caixa de seleção entraram na v1 pela ADR-009, decisão 5 — Fase 8; tags continuam
  fora.)*
- Integração com planos de aprendizagem (papel do block_dimensions).

## 11. Definição de pronto (toda fase)

- `moodle-plugin-ci` verde (phplint, phpcs, phpdoc, mustache, grunt, phpunit, behat).
- Testes de orçamento (§6.6) passando para todo endpoint tocado na fase.
- Strings em `en` e `pt_br`.
- Nenhum `$DB` fora de `classes/local/`; todo SQL com índice identificado em comentário e
  `LIMIT` ou agregação.
- ADRs da fase escritos em `docs/adr/`.
- Privacy provider atualizado se novo dado pessoal for gravado. CHANGELOG atualizado.
