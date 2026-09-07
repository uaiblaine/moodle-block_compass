<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Brazilian Portuguese strings for block_compass.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['action_continue'] = 'Continuar';
$string['action_open'] = 'Acessar';
$string['action_review'] = 'Rever';
$string['action_start'] = 'Começar';
$string['addtofavourites'] = 'Adicionar aos favoritos';
$string['allcourses'] = 'Todos os cursos ({$a})';
$string['archive'] = 'Arquivar {$a}';
$string['archiveall'] = 'Arquivar todos';
$string['archiveallconfirm'] = 'Arquivar {$a} cursos dormentes? Eles saem da sua lista aqui e no bloco Visão geral dos cursos, e você pode trazer qualquer um de volta em Arquivados.';
$string['archived'] = 'Arquivados';
$string['archiveerror'] = 'Não foi possível arquivar o curso. Nada mais foi alterado.';
$string['archivenone'] = 'Não há nada para arquivar.';
$string['archiving'] = 'Arquivando…';
$string['attention_max'] = 'Cards por faixa';
$string['attention_max_desc'] = 'Quantos cursos cada faixa do primeiro andar mostra (Continuar, Novas inscrições, Favoritos). O restante é contado no card fantasma. Entre 1 e 12.';
$string['badge_new'] = 'Novo';
$string['cachedef_categorymeta'] = 'Nomes, caminhos e contextos das categorias, compartilhados por todos os usuários';
$string['cachedef_coursemeta'] = 'Metadados de curso compartilhados por todos os usuários (nome, categoria, visibilidade, flag de conclusão, contexto)';
$string['cachedef_details'] = 'Progresso no curso, por usuário e curso';
$string['cachedef_inventory'] = 'Inventário de inscrições, por usuário';
$string['cachestores'] = 'Armazenamentos de cache';
$string['cachestores_desc'] = 'O Compass mantém três caches de aplicação (coursemeta, inventory e details) e foi projetado para sites muito grandes. Mapeie as três definições para um armazenamento compartilhado em memória, de preferência Redis, em Administração do site > Plugins > Cache > Configuração. Sem um armazenamento compartilhado em memória o plugin continua funcionando, mas o desempenho pode ficar severamente degradado: cada visita ao Painel recorre ao armazenamento em arquivo de cada nó web.';
$string['categoryindex'] = 'Categorias';
$string['chip_all'] = 'Todos';
$string['chip_favourites'] = 'Favoritos';
$string['chip_new'] = 'Novos';
$string['compass:myaddinstance'] = 'Adicionar um novo bloco Compass ao Painel';
$string['completed'] = 'Concluído';
$string['coursearchived'] = '{$a} arquivado';
$string['coursesingroup'] = '{$a} cursos';
$string['courseunarchived'] = '{$a} trazido de volta';
$string['deadline'] = 'Prazo: {$a}';
$string['default_view'] = 'Visão padrão da lista completa de cursos';
$string['default_view_desc'] = 'Como a lista completa de cursos se abre para quem nunca escolheu: uma lista compacta ou cartões com a imagem do curso. A escolha de cada pessoa é lembrada e prevalece sobre esta.';
$string['dormant'] = 'Dormentes';
$string['dormant_months'] = 'Meses até um curso ficar dormente';
$string['dormant_months_desc'] = 'Um curso que você não abre há esse tanto de meses é recolhido num grupo Dormentes ao final da lista completa, em vez de engrossar a categoria dele. Um curso que você nunca abriu conta a partir da inscrição. Padrão 12.';
$string['emptyattention'] = 'Nada para mostrar aqui por enquanto.';
$string['enable_favourites'] = 'Mostrar favoritos';
$string['enable_favourites_desc'] = 'Mostra a faixa Favoritos e a estrela em cada card. A estrela é a mesma usada pelo bloco Visão geral dos cursos.';
$string['enable_prewarm'] = 'Pré-aquecer usuários ativos';
$string['enable_prewarm_desc'] = 'Executa uma tarefa agendada noturna que aquece o inventário de cursos e as camadas compartilhadas de curso e categoria dos usuários ativos nos últimos "Pré-aquecer usuários ativos nos últimos" dias, para que a primeira visita ao Painel do dia leia o cache em vez de construí-lo. Desligado por padrão: sites com menos de algumas centenas de milhares de usuários não medirão a diferença. Sem um armazenamento compartilhado em memória como o Redis a tarefa aquece apenas o cache em arquivo do nó que executa o cron, que os nós web nunca leem.';
$string['enable_search'] = 'Mostrar a caixa de busca';
$string['enable_search_desc'] = 'Mostra a caixa de busca acima da lista completa de cursos. A busca filtra o que já está na página; nunca a recarrega.';
$string['enrolledago'] = 'Inscrito há {$a->when} · {$a->method}';
$string['enrolledagonomethod'] = 'Inscrito há {$a}';
$string['favouriteadded'] = '{$a} adicionado aos favoritos';
$string['favouriteerror'] = 'Não foi possível atualizar o favorito. Tente novamente.';
$string['favouriteremoved'] = '{$a} removido dos favoritos';
$string['filterby'] = 'Filtrar cursos';
$string['filterupdated'] = 'Filtro atualizado. As contagens dos grupos seguem sendo os totais até o grupo ser aberto.';
$string['ghost_explore'] = 'Explorar todos';
$string['ghost_more'] = 'outros cursos';
$string['ghost_more_favourites'] = 'favoritos a mais';
$string['ghost_more_new'] = 'novas inscrições a mais';
$string['group_depth'] = 'Profundidade de agrupamento';
$string['group_depth_desc'] = 'Profundidade de categoria, contada a partir do nível superior, que forma os grupos da lista completa de cursos. 1 agrupa por categoria de nível superior; 2 pelas subcategorias, e assim por diante. Cursos em categorias mais rasas agrupam na própria categoria.';
$string['hide_block_title'] = 'Ocultar o título do bloco';
$string['hide_block_title_desc'] = 'Exibe o bloco sem a barra de título; os títulos das faixas permanecem.';
$string['inventory_max'] = 'Máximo de cursos listados por completo';
$string['inventory_max_desc'] = 'Acima desta quantidade de cursos a lista completa carrega primeiro os cabeçalhos dos grupos e as linhas de cada grupo conforme ele é aberto, com uma busca no servidor sobre todos os cursos. Até ela a lista inteira é enviada de uma vez e filtrada no navegador. Padrão 250.';
$string['javascriptrequired'] = 'É necessário JavaScript para exibir seus cursos.';
$string['lastaccessago'] = 'Último acesso há {$a}';
$string['lastaccessjustnow'] = 'Acessado agora mesmo';
$string['lastopened'] = 'Aberto {$a}';
$string['loaderror'] = 'Não foi possível carregar seus cursos.';
$string['loadingrows'] = 'Carregando…';
$string['neveropened'] = 'Nunca aberto';
$string['new_days'] = 'Dias em que uma inscrição é nova';
$string['new_days_desc'] = 'Um curso em que você foi inscrito há até este número de dias, e que nunca abriu, aparece em Novas inscrições.';
$string['nocompletion'] = 'Sem conclusão configurada';
$string['nocourses'] = 'Você ainda não está inscrito em nenhum curso.';
$string['noresults'] = 'Nenhum curso corresponde.';
$string['pagednote'] = 'Os grupos carregam ao serem abertos; a busca cobre todos os seus cursos.';
$string['pluginname'] = 'Compass';
$string['prewarm'] = 'Pré-aquecimento';
$string['prewarm_budget_seconds'] = 'Orçamento de tempo do pré-aquecimento';
$string['prewarm_budget_seconds_desc'] = 'Por quanto tempo cada execução da tarefa de pré-aquecimento pode trabalhar. A tarefa para entre usuários quando o orçamento é atingido e retoma de onde parou na próxima execução. Mínimo de 60 segundos.';
$string['prewarm_days'] = 'Pré-aquecer usuários ativos nos últimos';
$string['prewarm_days_desc'] = 'Número de dias: apenas usuários que entraram dentro desta janela são pré-aquecidos. Padrão 7.';
$string['prewarm_desc'] = 'Opcionalmente preenche os caches dos usuários ativos recentemente fora do horário de pico, para que a primeira visita ao Painel do dia custe o mesmo que as seguintes.';
$string['privacy:metadata:preference:block_compass_view'] = 'A escolha de quem usa o bloco entre a visão em lista e a visão em cartões da lista completa de cursos.';
$string['progresserror'] = 'Não foi possível carregar parte do progresso.';
$string['progressloading'] = 'Carregando progresso';
$string['progresspercent'] = '{$a}% concluído';
$string['removefromfavourites'] = 'Remover dos favoritos';
$string['resultsshown'] = '{$a} cursos exibidos';
$string['retry'] = 'Tentar novamente';
$string['searchcourses'] = 'Buscar nos meus cursos';
$string['searchplaceholder'] = 'Filtrar por nome…';
$string['searchtooshort'] = 'Digite pelo menos {$a} caracteres';
$string['searchtruncated'] = 'Mostrando as primeiras {$a} correspondências';
$string['show_index'] = 'Mostrar o índice de categorias';
$string['show_index_desc'] = 'Mostra o índice lateral de categorias ao lado da lista completa de cursos em telas largas.';
$string['showmore'] = 'Mostrar mais';
$string['sort_category'] = 'Por categoria';
$string['sort_name'] = 'A–Z';
$string['sort_recent'] = 'Recentes';
$string['sortby'] = 'Ordenar cursos';
$string['strip_continue'] = 'Continuar de onde parei';
$string['strip_favourites'] = 'Meus favoritos';
$string['strip_new'] = 'Novas inscrições';
$string['task_warm_active_users'] = 'Pré-aquecer o inventário de cursos dos usuários ativos recentemente';
$string['unarchive'] = 'Desarquivar {$a}';
$string['unarchiveerror'] = 'Não foi possível trazer o curso de volta. Nada mais foi alterado.';
$string['uncategorised'] = 'Sem categoria';
$string['view_cards'] = 'Cartões';
$string['view_list'] = 'Lista';
$string['viewas'] = 'Mostrar cursos como';
$string['viewerror'] = 'Não foi possível salvar a sua escolha de visão.';
