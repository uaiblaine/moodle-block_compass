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

$string['cachedef_coursemeta'] = 'Metadados de curso compartilhados por todos os usuários (nome, categoria, visibilidade, imagem)';
$string['cachedef_details'] = 'Progresso no curso, por usuário e curso';
$string['cachedef_inventory'] = 'Inventário de inscrições, por usuário';
$string['cachestores'] = 'Armazenamentos de cache';
$string['cachestores_desc'] = 'O Compass mantém três caches de aplicação (coursemeta, inventory e details) e foi projetado para sites muito grandes. Mapeie as três definições para um armazenamento compartilhado em memória, de preferência Redis, em Administração do site > Plugins > Cache > Configuração. Sem um armazenamento compartilhado em memória o plugin continua funcionando, mas o desempenho pode ficar severamente degradado: cada visita ao Painel recorre ao armazenamento em arquivo de cada nó web.';
$string['compass:myaddinstance'] = 'Adicionar um novo bloco Compass ao Painel';
$string['javascriptrequired'] = 'É necessário JavaScript para exibir seus cursos.';
$string['placeholder'] = 'Seus cursos aparecerão aqui.';
$string['pluginname'] = 'Compass';
$string['privacy:metadata'] = 'O bloco Compass não armazena dados pessoais próprios. Ele lê cursos, inscrições, favoritos e preferências que o Moodle já armazena.';
