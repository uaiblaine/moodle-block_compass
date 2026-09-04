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
$string['coursesingroup'] = '{$a} cursos';
$string['deadline'] = 'Prazo: {$a}';
$string['emptyattention'] = 'Nada para mostrar aqui por enquanto.';
$string['enable_favourites'] = 'Mostrar favoritos';
$string['enable_favourites_desc'] = 'Mostra a faixa Favoritos e a estrela em cada card. A estrela é a mesma usada pelo bloco Visão geral dos cursos.';
$string['enable_search'] = 'Mostrar a caixa de busca';
$string['enable_search_desc'] = 'Mostra a caixa de busca acima da lista completa de cursos. A busca filtra o que já está na página; nunca a recarrega.';
$string['enrolledago'] = 'Inscrito há {$a->when} · {$a->method}';
$string['enrolledagonomethod'] = 'Inscrito há {$a}';
$string['favouriteadded'] = '{$a} adicionado aos favoritos';
$string['favouriteerror'] = 'Não foi possível atualizar o favorito. Tente novamente.';
$string['favouriteremoved'] = '{$a} removido dos favoritos';
$string['filterby'] = 'Filtrar cursos';
$string['ghost_explore'] = 'Explorar todos';
$string['ghost_more'] = 'outros cursos';
$string['ghost_more_favourites'] = 'favoritos a mais';
$string['ghost_more_new'] = 'novas inscrições a mais';
$string['group_depth'] = 'Profundidade de agrupamento';
$string['group_depth_desc'] = 'Profundidade de categoria, contada a partir do nível superior, que forma os grupos da lista completa de cursos. 1 agrupa por categoria de nível superior; 2 pelas subcategorias, e assim por diante. Cursos em categorias mais rasas agrupam na própria categoria.';
$string['hide_block_title'] = 'Ocultar o título do bloco';
$string['hide_block_title_desc'] = 'Exibe o bloco sem a barra de título; os títulos das faixas permanecem.';
$string['javascriptrequired'] = 'É necessário JavaScript para exibir seus cursos.';
$string['lastaccessago'] = 'Último acesso há {$a}';
$string['lastaccessjustnow'] = 'Acessado agora mesmo';
$string['lastopened'] = 'Aberto {$a}';
$string['loaderror'] = 'Não foi possível carregar seus cursos.';
$string['neveropened'] = 'Nunca aberto';
$string['new_days'] = 'Dias em que uma inscrição é nova';
$string['new_days_desc'] = 'Um curso em que você foi inscrito há até este número de dias, e que nunca abriu, aparece em Novas inscrições.';
$string['nocompletion'] = 'Sem conclusão configurada';
$string['nocourses'] = 'Você ainda não está inscrito em nenhum curso.';
$string['noresults'] = 'Nenhum curso corresponde.';
$string['opencourse'] = 'Abrir {$a}';
$string['placeholder'] = 'Seus cursos aparecerão aqui.';
$string['pluginname'] = 'Compass';
$string['privacy:metadata'] = 'O bloco Compass não armazena dados pessoais próprios. Ele lê cursos, inscrições, favoritos e preferências que o Moodle já armazena.';
$string['progressloading'] = 'Carregando progresso';
$string['progresspercent'] = '{$a}% concluído';
$string['removefromfavourites'] = 'Remover dos favoritos';
$string['resultsshown'] = '{$a} cursos exibidos';
$string['retry'] = 'Tentar novamente';
$string['searchcourses'] = 'Buscar nos meus cursos';
$string['searchplaceholder'] = 'Filtrar por nome…';
$string['show_index'] = 'Mostrar o índice de categorias';
$string['show_index_desc'] = 'Mostra o índice lateral de categorias ao lado da lista completa de cursos em telas largas.';
$string['sort_category'] = 'Por categoria';
$string['sort_name'] = 'A–Z';
$string['sort_recent'] = 'Recentes';
$string['sortby'] = 'Ordenar cursos';
$string['strip_continue'] = 'Continuar de onde parei';
$string['strip_favourites'] = 'Meus favoritos';
$string['strip_new'] = 'Novas inscrições';
$string['uncategorised'] = 'Sem categoria';
