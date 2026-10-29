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
 * Seed the demo data behind the README screenshots (development sites only, CLI).
 *
 * Idempotent and additive: everything it creates is found again by an idnumber, a shortname, a
 * username or an event uuid starting with "compassdemo", and a second run creates nothing new. Every
 * run moves the time-relative facts (due dates, accesses, enrolment times, events) so that they sit
 * around the day it runs, which is what a fresh capture needs. It never deletes or changes a record
 * it did not create.
 *
 * Usage, inside the stack's webserver container:
 *   php public/blocks/compass/docs/screenshots/tools/seed_demo.php [--credentials=FILE]
 *
 * The demo users' passwords are random, generated on their first creation and written only to the
 * credentials file (default: demo-credentials.txt beside this script, ignored by git). Activity
 * events go through each module's own refresh_events(); submissions are written straight to
 * {assign_submission} so that no submission event reaches any observer.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('CLI_SCRIPT', true);

require(__DIR__ . '/../../../../../config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->libdir . '/testing/generator/lib.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->dirroot . '/group/lib.php');
require_once($CFG->dirroot . '/calendar/lib.php');
require_once($CFG->dirroot . '/my/lib.php');
require_once($CFG->libdir . '/completionlib.php');

[$options, $unrecognised] = cli_get_params(
    ['credentials' => __DIR__ . '/demo-credentials.txt', 'help' => false],
    ['h' => 'help']
);
if ($unrecognised) {
    cli_error(get_string('cliunknowoption', 'admin', implode(PHP_EOL . '  ', $unrecognised)));
}
if ($options['help']) {
    echo "Seed the Compass README demo data.\n\nOptions:\n  --credentials=FILE  where new passwords are written\n";
    exit(0);
}

\core\session\manager::set_user(get_admin());

$seeder = new block_compass_demo_seeder($options['credentials']);
$seeder->run();

/**
 * The seeder: data tables first, then the steps that read them.
 *
 * @package    block_compass
 * @copyright  2026 Anderson Blaine
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class block_compass_demo_seeder {
    /** @var string Prefix of every idnumber, shortname and uuid this script owns. */
    public const PREFIX = 'compassdemo';

    /** @var string Where new passwords go. */
    private string $credentialsfile;

    /** @var \testing_data_generator Core's generator, used for activities only. */
    private \testing_data_generator $generator;

    /** @var \DateTimeZone The site's timezone, the demo users' too (they keep 99). */
    private \DateTimeZone $tz;

    /** @var int Unix time of this run. */
    private int $now;

    /** @var array username => user id. */
    private array $users = [];

    /** @var array course key => course record. */
    private array $courses = [];

    /** @var array activity idnumber => [cmid, instance id, modname]. */
    private array $activities = [];

    /**
     * Constructor.
     *
     * @param string $credentialsfile Where new passwords are written.
     */
    public function __construct(string $credentialsfile) {
        $this->credentialsfile = $credentialsfile;
        $this->generator = new \testing_data_generator();
        $this->tz = \core_date::get_server_timezone_object();
        $this->now = time();
    }

    /**
     * Run every step and print a summary.
     *
     * @return void
     */
    public function run(): void {
        $this->seed_users();
        $categories = $this->seed_categories();
        $this->seed_courses($categories);
        $this->seed_open_courses($categories);
        $this->seed_enrolments();
        $this->seed_activities();
        $this->seed_submissions();
        $this->seed_completion();
        $this->seed_events();
        $this->seed_relationships();
        $this->seed_dashboards();
        $this->purge_user_layers();
        mtrace('Done: ' . count($this->users) . ' users, ' . count($this->courses) . ' courses, '
            . count($this->activities) . ' activities.');
    }

    /**
     * A time relative to today in the site's timezone.
     *
     * @param int $days Days from today, negative in the past.
     * @param string $time H:i.
     * @return int Unix time.
     */
    private function at(int $days, string $time): int {
        [$hour, $minute] = array_map('intval', explode(':', $time));
        $day = (new \DateTimeImmutable('@' . $this->now))->setTimezone($this->tz)->setTime(0, 0);

        return $day->modify(($days >= 0 ? '+' : '') . $days . ' days')->setTime($hour, $minute)->getTimestamp();
    }

    /**
     * A moment from a pair: [days, 'H:i'] is a clock time on a day, ['now', seconds] is that many seconds from this run.
     *
     * @param array $pair The pair.
     * @return int Unix time.
     */
    private function moment(array $pair): int {
        return $pair[0] === 'now' ? $this->now + (int) $pair[1] : $this->at($pair[0], $pair[1]);
    }

    /**
     * The users: two named demo users and eight classmates.
     *
     * @return array username => [firstname, lastname].
     */
    private static function users(): array {
        return [
            'demo.student' => ['Alex', 'Morgan'],
            'demo.teacher' => ['Jordan', 'Lee'],
            'demo.priya' => ['Priya', 'Shah'],
            'demo.marcus' => ['Marcus', 'Chen'],
            'demo.sofia' => ['Sofia', 'Rossi'],
            'demo.daniel' => ['Daniel', 'Okafor'],
            'demo.emma' => ['Emma', 'Novak'],
            'demo.lucas' => ['Lucas', 'Silva'],
            'demo.hannah' => ['Hannah', 'Kim'],
            'demo.omar' => ['Omar', 'Haddad'],
        ];
    }

    /**
     * Create the users that do not exist yet; record new passwords in the credentials file only.
     *
     * @return void
     */
    private function seed_users(): void {
        global $DB, $CFG;

        $created = [];
        foreach (self::users() as $username => [$firstname, $lastname]) {
            $id = $DB->get_field('user', 'id', ['username' => $username, 'mnethostid' => $CFG->mnet_localhost_id]);
            if (!$id) {
                $password = 'Demo-' . random_string(14) . '9!';
                $id = user_create_user((object) [
                    'username' => $username,
                    'password' => $password,
                    'auth' => 'manual',
                    'confirmed' => 1,
                    'mnethostid' => $CFG->mnet_localhost_id,
                    'firstname' => $firstname,
                    'lastname' => $lastname,
                    'email' => $username . '@example.com',
                    'lang' => 'en',
                    'timezone' => '99',
                    'city' => 'London',
                    'country' => 'GB',
                    'idnumber' => self::PREFIX . '_' . $username,
                ], true, false);
                $created[] = $username . ' ' . $password;
            }
            $this->users[$username] = (int) $id;
        }
        if ($created) {
            file_put_contents($this->credentialsfile, implode(PHP_EOL, $created) . PHP_EOL, FILE_APPEND);
            mtrace('Created ' . count($created) . ' users; passwords appended to ' . $this->credentialsfile);
        }
        // Recent sign-ins, so that the Dashboard reads as a live account.
        foreach (['demo.student', 'demo.teacher'] as $username) {
            $DB->update_record('user', (object) [
                'id' => $this->users[$username],
                'firstaccess' => $this->at(-210, '09:00'),
                'lastlogin' => $this->at(-1, '08:40'),
                'currentlogin' => $this->now - 600,
                'lastaccess' => $this->now - 120,
            ]);
        }
    }

    /**
     * The categories: four top-level ones, so that tier 3 groups them (group_depth 1).
     *
     * @return array key => category id.
     */
    private function seed_categories(): array {
        global $DB;

        $categories = [
            'health' => ['Health Sciences', 'Clinical and biomedical courses.'],
            'humanities' => ['Humanities', 'Writing, history and ethics.'],
            'business' => ['Business and Management', 'Projects, finance and leadership.'],
            'technology' => ['Technology', 'Data, software and security.'],
        ];
        $ids = [];
        foreach ($categories as $key => [$name, $description]) {
            $idnumber = self::PREFIX . '_' . $key;
            $id = $DB->get_field('course_categories', 'id', ['idnumber' => $idnumber]);
            if (!$id) {
                $id = \core_course_category::create([
                    'name' => $name,
                    'idnumber' => $idnumber,
                    'parent' => 0,
                    'description' => $description . ' (Compass demo data.)',
                ])->id;
            }
            $ids[$key] = (int) $id;
        }

        return $ids;
    }

    /**
     * The courses.
     *
     * Keys: category, full name, Modality option (1 Online, 2 In-person, 3 Hybrid), summary,
     * start and end in days from today (end 0 for none).
     *
     * @return array key => [category, fullname, shortname, modality, summary, startdays, enddays].
     */
    private static function courses(): array {
        return [
            'anat101' => ['health', 'Human Anatomy and Physiology', 'ANAT101', 3,
                'The structure and function of the human body, system by system, with weekly lab practicals.', -60, 60],
            'phar210' => ['health', 'Clinical Pharmacology', 'PHAR210', 1,
                'How drugs act on the body and how the body handles drugs, from dosage to interactions.', -45, 75],
            'nutr150' => ['health', 'Nutrition and Metabolism', 'NUTR150', 1,
                'Macronutrients, energy balance and the evidence behind dietary advice.', -3, 90],
            'cskl300' => ['health', 'Clinical Skills Lab', 'CSKL300', 2,
                'Hands-on clinical skills in the simulation suite, assessed through OSCE stations.', -30, 60],
            'rsrch310' => ['health', 'Research Methods in Health', 'RSRCH310', 3,
                'Designing, conducting and appraising health research, from question to proposal.', -40, 50],
            'writ100' => ['humanities', 'Academic Writing', 'WRIT100', 1,
                'Argument, evidence and style: writing for university, one draft at a time.', -50, 40],
            'hist220' => ['humanities', 'History of Science', 'HIST220', 1,
                'From the scientific revolution to the genome: how knowledge is made and contested.', -5, 100],
            'ethc200' => ['humanities', 'Ethics in Health Care', 'ETHC200', 3,
                'Consent, capacity, confidentiality and the dilemmas of everyday practice.', -40, 55],
            'phil101' => ['humanities', 'Introduction to Philosophy', 'PHIL101', 1,
                'The big questions of knowledge, mind and morality, read through the classic texts.', -220, -80],
            'pmgt110' => ['business', 'Project Management Fundamentals', 'PMGT110', 3,
                'Scope, schedule, risk and people: running a project from charter to close.', -35, 60],
            'acct120' => ['business', 'Financial Accounting', 'ACCT120', 1,
                'Ledgers, statements and the language of business numbers.', -1, 90],
            'lead230' => ['business', 'Leadership and Team Dynamics', 'LEAD230', 2,
                'Leading teams through change: motivation, feedback and decision making.', 12, 100],
            'data200' => ['technology', 'Data Analysis with Python', 'DATA200', 1,
                'Cleaning, exploring and visualising real data sets with pandas and notebooks.', -30, 70],
            'webd101' => ['technology', 'Web Development Basics', 'WEBD101', 1,
                'HTML, CSS and a first taste of JavaScript.', -720, -500],
            'cybr150' => ['technology', 'Cybersecurity Essentials', 'CYBR150', 1,
                'Threats, defences and the habits that keep systems safe.', 20, 110],
            'stat210' => ['technology', 'Statistics for Research', 'STAT210', 1,
                'Descriptive and inferential statistics for the research project.', -160, -20],
        ];
    }

    /**
     * Create the courses that do not exist yet, with a cover image, completion on and a Modality value.
     *
     * @param array $categories key => category id.
     * @return void
     */
    private function seed_courses(array $categories): void {
        global $DB;

        $modality = $DB->get_record('customfield_field', ['shortname' => 'modalidade']);
        foreach (self::courses() as $key => [$category, $fullname, $shortname, $modalityoption, $summary, $start, $end]) {
            $course = $DB->get_record('course', ['idnumber' => self::PREFIX . '_' . $key]);
            if (!$course) {
                $course = create_course((object) [
                    'category' => $categories[$category],
                    'fullname' => $fullname,
                    'shortname' => $shortname,
                    'idnumber' => self::PREFIX . '_' . $key,
                    'summary' => '<p>' . $summary . '</p>',
                    'summaryformat' => FORMAT_HTML,
                    'format' => 'topics',
                    'numsections' => 4,
                    'startdate' => $this->at($start, '00:00'),
                    'enddate' => $end ? $this->at($end, '00:00') : 0,
                    'enablecompletion' => 1,
                    'showcompletionconditions' => 1,
                    'visible' => 1,
                ]);
                mtrace('Created course ' . $shortname);
            } else {
                $DB->update_record('course', (object) [
                    'id' => $course->id,
                    'startdate' => $this->at($start, '00:00'),
                    'enddate' => $end ? $this->at($end, '00:00') : 0,
                ]);
            }
            $this->courses[$key] = $DB->get_record('course', ['id' => $course->id], '*', MUST_EXIST);
            $this->course_image($this->courses[$key], $category);
            if ($modality && !$DB->record_exists('customfield_data', ['fieldid' => $modality->id, 'instanceid' => $course->id])) {
                $field = \core_customfield\field_controller::create((int) $modality->id);
                $this->generator->get_plugin_generator('core_customfield')->add_instance_data(
                    $field,
                    (int) $course->id,
                    $modalityoption
                );
            }
        }
    }

    /**
     * The open-for-enrolment courses (ADR-017): key => [category key, full name, shortname, start in days].
     *
     * demo.student is enrolled in none of them. Health holds three, Technology two and Business one,
     * so the line shows a group of one beside groups of several. Starts sit inside the default band
     * (7 days back to 30 ahead) and are moved on every run.
     *
     * @return array
     */
    private static function open_courses(): array {
        return [
            'open_bioe' => ['health', 'Bioethics in Practice', 'OPEN-BIOE', -3],
            'open_epid' => ['health', 'Introduction to Epidemiology', 'OPEN-EPID', 4],
            'open_firs' => ['health', 'First Aid and Emergency Response', 'OPEN-FIRS', 15],
            'open_dsgn' => ['technology', 'Interface Design Basics', 'OPEN-DSGN', 2],
            'open_cloud' => ['technology', 'Cloud Computing Foundations', 'OPEN-CLOUD', 20],
            'open_mark' => ['business', 'Marketing Fundamentals', 'OPEN-MARK', 9],
        ];
    }

    /**
     * Create (or re-date) the open courses, each with an enabled self enrolment accepting new
     * enrolments, and one more that demo.teacher teaches (it must never show to demo.teacher).
     *
     * Course creation adds a disabled self instance; this enables it, or adds one, and opens it.
     *
     * @param array $categories key => category id.
     * @return void
     */
    private function seed_open_courses(array $categories): void {
        global $DB;

        $self = enrol_get_plugin('self');
        $roles = $DB->get_records_menu('role', null, '', 'shortname, id');
        $rows = self::open_courses();
        // The taught course: demo.teacher holds an enrolment, so the line never counts it.
        $rows['open_taught'] = ['humanities', 'Medical Humanities Seminar', 'OPEN-TAUGHT', 6];
        foreach ($rows as $key => [$category, $fullname, $shortname, $start]) {
            $idnumber = self::PREFIX . '_' . $key;
            $course = $DB->get_record('course', ['idnumber' => $idnumber]);
            if (!$course) {
                $course = create_course((object) [
                    'category' => $categories[$category],
                    'fullname' => $fullname,
                    'shortname' => $shortname,
                    'idnumber' => $idnumber,
                    'summary' => '<p>Open for enrolment. (Compass demo data.)</p>',
                    'summaryformat' => FORMAT_HTML,
                    'format' => 'topics',
                    'numsections' => 4,
                    'startdate' => $this->at($start, '00:00'),
                    'visible' => 1,
                ]);
                mtrace('Created course ' . $shortname);
            } else {
                $DB->set_field('course', 'startdate', $this->at($start, '00:00'), ['id' => $course->id]);
            }
            $instance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'self'], '*', IGNORE_MULTIPLE);
            if (!$instance) {
                $self->add_instance($course, ['roleid' => (int) $roles['student']]);
                $instance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'self'], '*', MUST_EXIST);
            }
            // Open: enabled, new enrolments allowed, no dates and no key.
            $DB->update_record('enrol', (object) [
                'id' => $instance->id,
                'status' => ENROL_INSTANCE_ENABLED,
                'customint6' => 1,
                'enrolstartdate' => 0,
                'enrolenddate' => 0,
                'password' => '',
                'timemodified' => $this->now,
            ]);
            if ($key === 'open_taught') {
                $manual = enrol_get_plugin('manual');
                $minstance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'manual']);
                if (!$minstance) {
                    $manual->add_instance($course);
                    $minstance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'manual'], '*', MUST_EXIST);
                }
                $manual->enrol_user($minstance, $this->users['demo.teacher'], (int) $roles['editingteacher']);
            }
        }
        // The seeder writes the tables directly, so no event told the shared catalogue.
        \block_compass\local\catalogue_cache::delete();
    }

    /**
     * Draw a course image once: a soft two-colour gradient with a few translucent shapes in the
     * category's palette, seeded by the short name so that a rerun draws the same picture.
     *
     * @param \stdClass $course The course.
     * @param string $category The category key.
     * @return void
     */
    private function course_image(\stdClass $course, string $category): void {
        $context = \core\context\course::instance($course->id);
        $fs = get_file_storage();
        if (!$fs->is_area_empty($context->id, 'course', 'overviewfiles', 0)) {
            return;
        }
        $palettes = [
            'health' => [[14, 116, 144], [94, 186, 160], [214, 245, 236]],
            'humanities' => [[176, 84, 64], [236, 170, 90], [252, 236, 214]],
            'business' => [[38, 64, 140], [96, 140, 220], [222, 232, 252]],
            'technology' => [[84, 54, 150], [64, 170, 200], [234, 226, 252]],
        ];
        [$dark, $mid, $light] = $palettes[$category];
        mt_srand(crc32($course->shortname));
        $width = 960;
        $height = 480;
        $image = imagecreatetruecolor($width, $height);
        imagealphablending($image, true);
        $angle = mt_rand(0, 100) / 100;
        for ($x = 0; $x < $width; $x++) {
            $t = ($x / $width) * (0.6 + 0.4 * $angle);
            $colour = imagecolorallocate(
                $image,
                (int) ($dark[0] + ($mid[0] - $dark[0]) * $t),
                (int) ($dark[1] + ($mid[1] - $dark[1]) * $t),
                (int) ($dark[2] + ($mid[2] - $dark[2]) * $t)
            );
            imageline($image, $x, 0, $x, $height, $colour);
        }
        for ($i = 0; $i < 7; $i++) {
            $alpha = mt_rand(88, 112);
            $tone = $i % 2 ? $light : $mid;
            $colour = imagecolorallocatealpha($image, $tone[0], $tone[1], $tone[2], $alpha);
            $size = mt_rand(140, 420);
            $cx = mt_rand(-60, $width + 60);
            $cy = mt_rand(-60, $height + 60);
            if ($i % 3 === 2) {
                imagefilledrectangle($image, $cx, $cy, $cx + $size, $cy + (int) ($size / 3), $colour);
            } else {
                imagefilledellipse($image, $cx, $cy, $size, $size, $colour);
            }
        }
        $stroke = imagecolorallocatealpha($image, 255, 255, 255, 96);
        imagesetthickness($image, 3);
        $base = mt_rand(140, 340);
        for ($i = 0; $i < 4; $i++) {
            imagearc($image, (int) ($width * 0.78), $base, 220 + $i * 70, 220 + $i * 70, 180, 360, $stroke);
        }
        ob_start();
        imagejpeg($image, null, 86);
        $jpeg = ob_get_clean();
        imagedestroy($image);
        $fs->create_file_from_string([
            'contextid' => $context->id,
            'component' => 'course',
            'filearea' => 'overviewfiles',
            'itemid' => 0,
            'filepath' => '/',
            'filename' => 'cover.jpg',
        ], $jpeg);
        \block_compass\local\course_meta::delete((int) $course->id);
    }

    /**
     * Who is enrolled where, as what, since when, last seen when.
     *
     * Each row: username, course key, role, days since enrolment (negative), last access as
     * [days, H:i] or null for never, start in days (null for none).
     *
     * @return array
     */
    private static function enrolments(): array {
        $rows = [
            ['demo.student', 'anat101', 'student', -60, [0, '-2h'], null],
            ['demo.student', 'phar210', 'student', -45, [-1, '19:20'], null],
            ['demo.student', 'nutr150', 'student', -3, null, null],
            ['demo.student', 'cskl300', 'student', -30, [-4, '10:05'], null],
            ['demo.student', 'writ100', 'student', -50, [-3, '21:10'], null],
            ['demo.student', 'hist220', 'student', -5, null, null],
            ['demo.student', 'ethc200', 'student', -40, [-9, '14:30'], null],
            ['demo.student', 'phil101', 'student', -220, [-95, '11:00'], null],
            ['demo.student', 'pmgt110', 'student', -35, [-6, '09:45'], null],
            ['demo.student', 'acct120', 'student', -1, null, null],
            ['demo.student', 'lead230', 'student', -2, null, 12],
            ['demo.student', 'data200', 'student', -30, [-12, '20:15'], null],
            ['demo.student', 'webd101', 'student', -720, [-430, '18:00'], null],
            ['demo.student', 'stat210', 'student', -160, [-100, '16:00'], null],
            ['demo.teacher', 'cskl300', 'editingteacher', -60, [-1, '17:30'], null],
            ['demo.teacher', 'rsrch310', 'editingteacher', -60, [0, '-5h'], null],
            ['demo.teacher', 'anat101', 'editingteacher', -90, [-2, '12:00'], null],
            ['demo.teacher', 'pmgt110', 'student', -35, [-5, '20:00'], null],
            ['demo.teacher', 'data200', 'student', -20, [-8, '21:00'], null],
        ];
        $classmates = ['demo.priya', 'demo.marcus', 'demo.sofia', 'demo.daniel', 'demo.emma', 'demo.lucas',
            'demo.hannah', 'demo.omar'];
        foreach ($classmates as $i => $username) {
            foreach (['anat101', 'cskl300', 'rsrch310', 'pmgt110'] as $course) {
                $rows[] = [$username, $course, 'student', -30 - $i, [-1 - ($i % 3), '15:00'], null];
            }
        }

        return $rows;
    }

    /**
     * Enrol through the manual plugin, then pin the times the tiers read.
     *
     * @return void
     */
    private function seed_enrolments(): void {
        global $DB;

        $manual = enrol_get_plugin('manual');
        $roles = $DB->get_records_menu('role', null, '', 'shortname, id');
        foreach (self::enrolments() as [$username, $key, $role, $since, $access, $start]) {
            $course = $this->courses[$key];
            $instance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'manual']);
            if (!$instance) {
                $manual->add_instance($course);
                $instance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'manual'], '*', MUST_EXIST);
            }
            $userid = $this->users[$username];
            $timestart = $start === null ? 0 : $this->at($start, '00:00');
            $manual->enrol_user($instance, $userid, (int) $roles[$role], $timestart, 0, ENROL_USER_ACTIVE);
            $ue = $DB->get_record('user_enrolments', ['enrolid' => $instance->id, 'userid' => $userid], '*', MUST_EXIST);
            $created = $this->at($since, '10:00');
            $DB->update_record('user_enrolments', (object) [
                'id' => $ue->id,
                'timestart' => $timestart,
                'timecreated' => $created,
                'timemodified' => $created,
            ]);
            $this->access($userid, (int) $course->id, $access);
        }
    }

    /**
     * Record (or move) a course access; null leaves the course never opened.
     *
     * @param int $userid The user.
     * @param int $courseid The course.
     * @param array|null $access [days, H:i] or [0, '-Nh'] for N hours ago.
     * @return void
     */
    private function access(int $userid, int $courseid, ?array $access): void {
        global $DB;

        if ($access === null) {
            return;
        }
        [$days, $time] = $access;
        $when = str_starts_with($time, '-') ? $this->now - ((int) substr($time, 1)) * HOURSECS : $this->at($days, $time);
        $existing = $DB->get_record('user_lastaccess', ['userid' => $userid, 'courseid' => $courseid]);
        if ($existing) {
            $DB->set_field('user_lastaccess', 'timeaccess', $when, ['id' => $existing->id]);
        } else {
            $DB->insert_record('user_lastaccess', (object) ['userid' => $userid, 'courseid' => $courseid, 'timeaccess' => $when]);
        }
    }

    /**
     * The activities: [course key, modname, idnumber suffix, name, settings].
     *
     * Dates in settings are [days, H:i] pairs resolved by at(); 'graded' false makes an
     * assignment ungraded (a to-do item on the strip).
     *
     * @return array
     */
    private static function activities(): array {
        return [
            // Human Anatomy and Physiology: due today, tomorrow, a late one and later work.
            ['anat101', 'assign', 'cardio', 'Lab report: cardiovascular system', ['due' => [0, '23:59'], 'criterion' => true]],
            ['anat101', 'quiz', 'quiz3', 'Quiz 3: Respiratory system', ['close' => [1, '18:00'], 'open' => [-7, '09:00']]],
            ['anat101', 'assign', 'readinglog6', 'Reading log: week 6', ['due' => [1, '17:00'], 'graded' => false]],
            ['anat101', 'assign', 'muscle', 'Case study: muscle physiology',
                ['due' => [-2, '23:59'], 'cutoff' => [4, '23:59'], 'gradingdue' => [7, '17:00']]],
            // Up next (ADR-016): moved with the clock on every run, so two are imminent and soon.
            ['anat101', 'assign', 'heartsounds', 'Peer assessment: heart sounds',
                ['due' => ['now', 40 * MINSECS], 'graded' => false]],
            ['anat101', 'assign', 'histology', 'Histology slide worksheet',
                ['due' => ['now', 150 * MINSECS], 'graded' => false]],
            ['anat101', 'assign', 'nervous', 'Lab report: nervous system', ['due' => [13, '23:59']]],
            ['anat101', 'quiz', 'midterm', 'Midterm exam', ['close' => [20, '12:00'], 'open' => [-1, '09:00']]],
            // Clinical Pharmacology (starred).
            ['phar210', 'quiz', 'dosage', 'Dosage calculations quiz', ['close' => [1, '12:00'], 'open' => [-3, '09:00']]],
            ['phar210', 'assign', 'pk', 'Pharmacokinetics problem set', ['due' => [-1, '17:00'], 'cutoff' => [5, '17:00']]],
            ['phar210', 'assign', 'interactions', 'Drug interaction essay', ['due' => [6, '23:59']]],
            // Nutrition and Metabolism (new).
            ['nutr150', 'assign', 'diary', 'Food diary', ['due' => [4, '20:00'], 'graded' => false]],
            ['nutr150', 'quiz', 'macro', 'Macronutrients quiz', ['close' => [11, '18:00'], 'open' => [-2, '09:00']]],
            // Clinical Skills Lab (demo.teacher teaches it).
            ['cskl300', 'assign', 'osce', 'OSCE station reflection', ['due' => [-5, '17:00'], 'gradingdue' => [1, '17:00']]],
            ['cskl300', 'assign', 'wound', 'Wound care log', ['due' => [-1, '17:00'], 'gradingdue' => [5, '17:00']]],
            ['cskl300', 'assign', 'debrief', 'Simulation debrief', ['due' => [2, '17:00'], 'gradingdue' => [9, '17:00']]],
            ['cskl300', 'quiz', 'infection', 'Infection control quiz', ['close' => [6, '18:00'], 'open' => [-4, '09:00']]],
            // Research Methods in Health (demo.teacher teaches it).
            ['rsrch310', 'assign', 'litreview', 'Literature review', ['due' => [-6, '17:00'], 'gradingdue' => [0, '17:00']]],
            ['rsrch310', 'assign', 'proposal', 'Research proposal', ['due' => [8, '17:00'], 'gradingdue' => [15, '17:00']]],
            // Academic Writing.
            ['writ100', 'assign', 'draft1', 'Argumentative essay: first draft', ['due' => [2, '23:59']]],
            ['writ100', 'assign', 'peer', 'Peer review', ['due' => [5, '12:00'], 'graded' => false]],
            ['writ100', 'assign', 'biblio', 'Annotated bibliography', ['due' => [-5, '17:00'], 'cutoff' => [2, '17:00']]],
            ['writ100', 'assign', 'final', 'Final essay', ['due' => [27, '23:59']]],
            // History of Science (new).
            ['hist220', 'assign', 'source', 'Source analysis', ['due' => [13, '17:00']]],
            // Ethics in Health Care (starred).
            ['ethc200', 'assign', 'journal', 'Reflective journal', ['due' => [0, '18:00'], 'graded' => false]],
            ['ethc200', 'quiz', 'consent', 'Consent and capacity quiz', ['close' => [7, '18:00'], 'open' => [-5, '09:00']]],
            ['ethc200', 'assign', 'casepost', 'Case discussion post', ['due' => [16, '23:59']]],
            // Project Management Fundamentals (starred).
            ['pmgt110', 'assign', 'charter', 'Project charter', ['due' => [3, '23:59']]],
            ['pmgt110', 'quiz', 'risk', 'Risk management quiz', ['close' => [10, '18:00'], 'open' => [-3, '09:00']]],
            // Financial Accounting (new).
            ['acct120', 'quiz', 'balance', 'Balance sheet quiz', ['close' => [8, '18:00'], 'open' => [-1, '09:00']]],
            ['acct120', 'assign', 'ledger', 'Ledger exercise', ['due' => [15, '17:00']]],
            // Data Analysis with Python.
            ['data200', 'assign', 'cleaning', 'Data cleaning exercise', ['due' => [1, '23:59']]],
            ['data200', 'assign', 'eda', 'Exploratory analysis notebook', ['due' => [4, '23:59']]],
            ['data200', 'assign', 'portfolio', 'Visualisation portfolio', ['due' => [23, '23:59']]],
        ];
    }

    /**
     * Create the activities once; on every run move their dates and refresh their events.
     *
     * @return void
     */
    private function seed_activities(): void {
        global $DB;

        foreach (self::activities() as [$key, $modname, $suffix, $name, $settings]) {
            $course = $this->courses[$key];
            $idnumber = self::PREFIX . '_' . $key . '_' . $suffix;
            $fields = $this->activity_fields($modname, $settings);
            $cm = $DB->get_record('course_modules', ['course' => $course->id, 'idnumber' => $idnumber]);
            if (!$cm) {
                $record = $fields + [
                    'course' => $course->id,
                    'name' => $name,
                    'idnumber' => $idnumber,
                    'section' => 1,
                    'intro' => '<p>' . $name . '.</p>',
                    'completion' => COMPLETION_TRACKING_MANUAL,
                ];
                if ($modname === 'assign') {
                    $record['assignsubmission_onlinetext_enabled'] = 1;
                    if (($settings['graded'] ?? true) === false) {
                        $record['gradetype'] = GRADE_TYPE_NONE;
                    }
                }
                $instance = $this->generator->create_module($modname, $record);
                $cm = $DB->get_record('course_modules', ['id' => $instance->cmid], '*', MUST_EXIST);
            } else {
                $DB->update_record($modname, (object) (['id' => $cm->instance] + $fields));
            }
            $instance = $DB->get_record($modname, ['id' => $cm->instance], '*', MUST_EXIST);
            $cminfo = get_coursemodule_from_id($modname, $cm->id, 0, false, MUST_EXIST);
            course_module_calendar_event_update_process($instance, $cminfo);
            $this->activities[$idnumber] = [(int) $cm->id, (int) $cm->instance, $modname];
            if (!empty($settings['criterion'])) {
                $this->criterion($course, (int) $cm->id, $modname);
            }
        }
        rebuild_course_cache(0, true);
    }

    /**
     * The module columns a settings row stands for.
     *
     * @param string $modname assign or quiz.
     * @param array $settings The row's settings.
     * @return array Column => value.
     */
    private function activity_fields(string $modname, array $settings): array {
        $time = fn(?array $pair): int => $pair === null ? 0 : $this->moment($pair);
        if ($modname === 'quiz') {
            return ['timeopen' => $time($settings['open'] ?? null), 'timeclose' => $time($settings['close'] ?? null)];
        }

        return [
            'allowsubmissionsfromdate' => $this->at(-14, '09:00'),
            'duedate' => $time($settings['due'] ?? null),
            'cutoffdate' => $time($settings['cutoff'] ?? null),
            'gradingduedate' => $time($settings['gradingdue'] ?? null),
        ];
    }

    /**
     * Make an activity a course completion criterion, so its item says it counts toward completion.
     *
     * @param \stdClass $course The course.
     * @param int $cmid The course module.
     * @param string $modname Its module name.
     * @return void
     */
    private function criterion(\stdClass $course, int $cmid, string $modname): void {
        global $DB;

        $conditions = ['course' => $course->id, 'criteriatype' => COMPLETION_CRITERIA_TYPE_ACTIVITY, 'moduleinstance' => $cmid];
        if (!$DB->record_exists('course_completion_criteria', $conditions)) {
            $DB->insert_record('course_completion_criteria', (object) ($conditions + ['module' => $modname]));
        }
    }

    /**
     * Submissions waiting for the teacher, and two of Alex's own, written straight to the table.
     *
     * @return void
     */
    private function seed_submissions(): void {
        global $DB;

        $classmates = ['demo.priya', 'demo.marcus', 'demo.sofia', 'demo.daniel', 'demo.emma', 'demo.lucas',
            'demo.hannah', 'demo.omar'];
        $plan = [
            'cskl300_osce' => array_merge(['demo.student'], array_slice($classmates, 0, 7)),
            'cskl300_wound' => array_slice($classmates, 0, 5),
            'rsrch310_litreview' => array_slice($classmates, 0, 6),
            'anat101_muscle' => array_slice($classmates, 2, 4),
            'data200_cleaning' => ['demo.student'],
        ];
        foreach ($plan as $suffix => $usernames) {
            [, $assignid] = $this->activities[self::PREFIX . '_' . $suffix];
            foreach ($usernames as $i => $username) {
                $userid = $this->users[$username];
                $when = $this->now - (2 + $i) * HOURSECS - 3 * DAYSECS;
                $existing = $DB->get_record('assign_submission', ['assignment' => $assignid, 'userid' => $userid,
                    'groupid' => 0, 'attemptnumber' => 0]);
                if ($existing) {
                    continue;
                }
                $DB->insert_record('assign_submission', (object) [
                    'assignment' => $assignid,
                    'userid' => $userid,
                    'timecreated' => $when,
                    'timemodified' => $when,
                    'timestarted' => $when - HOURSECS,
                    'status' => 'submitted',
                    'groupid' => 0,
                    'attemptnumber' => 0,
                    'latest' => 1,
                ]);
            }
        }
    }

    /**
     * Reading pages with manual completion, some ticked, so that cards show progress; one course complete.
     *
     * @return void
     */
    private function seed_completion(): void {
        global $DB;

        $pages = [
            'anat101' => [5, 3],
            'phar210' => [4, 1],
            'writ100' => [4, 3],
            'pmgt110' => [4, 2],
            'data200' => [3, 1],
            'ethc200' => [3, 0],
            'cskl300' => [4, 2],
            'phil101' => [3, 3],
        ];
        $userid = $this->users['demo.student'];
        foreach ($pages as $key => [$count, $done]) {
            $course = $this->courses[$key];
            for ($i = 1; $i <= $count; $i++) {
                $idnumber = self::PREFIX . '_' . $key . '_page' . $i;
                $cmid = $DB->get_field('course_modules', 'id', ['course' => $course->id, 'idnumber' => $idnumber]);
                if (!$cmid) {
                    $cmid = $this->generator->create_module('page', [
                        'course' => $course->id,
                        'name' => 'Week ' . $i . ' reading',
                        'idnumber' => $idnumber,
                        'section' => 1,
                        'content' => '<p>Readings for week ' . $i . '.</p>',
                        'completion' => COMPLETION_TRACKING_MANUAL,
                    ])->cmid;
                }
                $ticked = $DB->record_exists('course_modules_completion', ['coursemoduleid' => $cmid, 'userid' => $userid]);
                if ($i <= $done && !$ticked) {
                    $DB->insert_record('course_modules_completion', (object) [
                        'coursemoduleid' => $cmid,
                        'userid' => $userid,
                        'completionstate' => COMPLETION_COMPLETE,
                        'overrideby' => null,
                        'timemodified' => $this->now - $i * DAYSECS,
                    ]);
                }
            }
            \cache::make('core', 'completion')->delete($userid . '_' . $course->id);
        }
        // Introduction to Philosophy is complete.
        $course = $this->courses['phil101'];
        $completion = ['userid' => $userid, 'course' => $course->id];
        $record = (object) ($completion + [
            'timeenrolled' => $this->at(-220, '10:00'),
            'timestarted' => $this->at(-219, '10:00'),
            'timecompleted' => $this->at(-95, '11:00'),
            'reaggregate' => 0,
        ]);
        if ($id = $DB->get_field('course_completions', 'id', $completion)) {
            $record->id = $id;
            $DB->update_record('course_completions', $record);
        } else {
            $DB->insert_record('course_completions', $record);
        }
        \cache::make('core', 'coursecompletion')->delete($userid . '_' . $course->id);
    }

    /**
     * Course, group, site and personal events, found again by uuid and moved on every run.
     *
     * @return void
     */
    private function seed_events(): void {
        global $DB;

        $group = $this->group($this->courses['pmgt110'], 'Project team A', ['demo.student', 'demo.teacher',
            'demo.priya', 'demo.marcus']);
        $events = [
            ['anat-briefing', 'course', 'anat101', 'Anatomy lab practical briefing', [1, '14:00'], HOURSECS],
            ['anat-induction', 'course', 'anat101', 'Lab safety induction', [-6, '10:00'], HOURSECS],
            ['anat-demo', 'course', 'anat101', 'Dissection demonstration', ['now', -20 * MINSECS], HOURSECS],
            ['phar-lecture', 'course', 'phar210', 'Guest lecture: antibiotic stewardship', [8, '15:00'], HOURSECS],
            ['writ-workshop', 'course', 'writ100', 'Writing centre workshop', [0, '16:00'], HOURSECS],
            ['cskl-suite', 'course', 'cskl300', 'Simulation suite open session', [2, '10:00'], 2 * HOURSECS],
            ['rsrch-dropin', 'course', 'rsrch310', 'Ethics committee drop-in', [1, '13:00'], HOURSECS],
            ['pmgt-standup1', 'group', 'pmgt110', 'Team stand-up', [2, '09:30'], 1800],
            ['pmgt-standup2', 'group', 'pmgt110', 'Team stand-up', [7, '09:30'], 1800],
            ['site-careers', 'site', null, 'Careers fair', [-2, '10:00'], 6 * HOURSECS],
            ['site-openday', 'site', null, 'Open day', [12, '09:00'], 7 * HOURSECS],
            ['site-wellbeing', 'site', null, 'Student wellbeing week begins', [19, '09:00'], 0],
            ['user-studygroup', 'user', 'demo.student', 'Study group with Priya', [1, '19:00'], 2 * HOURSECS],
            ['user-advisor', 'user', 'demo.student', 'Meet academic advisor', [7, '11:00'], 1800],
            ['user-department', 'user', 'demo.teacher', 'Department meeting', [2, '15:00'], HOURSECS],
        ];
        foreach ($events as [$uuid, $type, $owner, $name, $when, $duration]) {
            $uuid = self::PREFIX . '-' . $uuid;
            $timestart = $this->moment($when);
            if ($id = $DB->get_field('event', 'id', ['uuid' => $uuid])) {
                $DB->set_field('event', 'timestart', $timestart, ['id' => $id]);
                $DB->set_field('event', 'timesort', $timestart, ['id' => $id]);
                continue;
            }
            $data = (object) [
                'name' => $name,
                'description' => '',
                'format' => FORMAT_HTML,
                'eventtype' => $type,
                'courseid' => 0,
                'groupid' => 0,
                'userid' => $this->users['demo.teacher'],
                'timestart' => $timestart,
                'timeduration' => $duration,
                'visible' => 1,
                'uuid' => $uuid,
            ];
            if ($type === 'course' || $type === 'group') {
                $data->courseid = $this->courses[$owner]->id;
                $data->groupid = $type === 'group' ? $group : 0;
            } else if ($type === 'site') {
                $data->courseid = SITEID;
            } else {
                $data->userid = $this->users[$owner];
            }
            \calendar_event::create($data, false);
        }
    }

    /**
     * A group with members, created once.
     *
     * @param \stdClass $course The course.
     * @param string $name The group name.
     * @param string[] $usernames The members.
     * @return int The group id.
     */
    private function group(\stdClass $course, string $name, array $usernames): int {
        global $DB;

        $idnumber = self::PREFIX . '_' . strtolower($course->shortname) . '_a';
        $groupid = $DB->get_field('groups', 'id', ['courseid' => $course->id, 'idnumber' => $idnumber]);
        if (!$groupid) {
            $groupid = groups_create_group((object) ['courseid' => $course->id, 'name' => $name, 'idnumber' => $idnumber]);
        }
        foreach ($usernames as $username) {
            groups_add_member($groupid, $this->users[$username]);
        }

        return (int) $groupid;
    }

    /**
     * Stars, an archived course and an application awaiting approval.
     *
     * @return void
     */
    private function seed_relationships(): void {
        global $DB;

        $favourites = [
            'demo.student' => ['phar210', 'ethc200', 'pmgt110'],
            'demo.teacher' => ['rsrch310'],
        ];
        foreach ($favourites as $username => $keys) {
            $userid = $this->users[$username];
            $service = \core_favourites\service_factory::get_service_for_user_context(\core\context\user::instance($userid));
            foreach ($keys as $key) {
                $courseid = (int) $this->courses[$key]->id;
                $coursecontext = \core\context\course::instance($courseid);
                if (!$service->favourite_exists('core_course', 'courses', $courseid, $coursecontext)) {
                    $service->create_favourite('core_course', 'courses', $courseid, $coursecontext);
                }
            }
        }
        // Archived by Alex, as the Course overview block archives.
        set_user_preference('block_myoverview_hidden_course_' . $this->courses['stat210']->id, 1, $this->users['demo.student']);

        // An application awaiting approval, as enrol_apply writes one.
        $course = $this->courses['cybr150'];
        $instanceid = $DB->get_field('enrol', 'id', ['courseid' => $course->id, 'enrol' => 'apply']);
        if (!$instanceid) {
            $instanceid = $DB->insert_record('enrol', (object) [
                'enrol' => 'apply',
                'status' => ENROL_INSTANCE_ENABLED,
                'courseid' => $course->id,
                'sortorder' => 5,
                'timecreated' => $this->now,
                'timemodified' => $this->now,
            ]);
        }
        $userid = $this->users['demo.student'];
        if (!$DB->record_exists('user_enrolments', ['enrolid' => $instanceid, 'userid' => $userid])) {
            $DB->insert_record('user_enrolments', (object) [
                'status' => ENROL_USER_SUSPENDED,
                'enrolid' => $instanceid,
                'userid' => $userid,
                'timestart' => 0,
                'timeend' => 0,
                'modifierid' => 0,
                'timecreated' => $this->at(-4, '10:00'),
                'timemodified' => $this->at(-4, '10:00'),
            ]);
        }
    }

    /**
     * Give each named demo user a private Dashboard holding Compass alone in the content region.
     *
     * Only the demo users' own pages are touched: the site default page is left as it is.
     *
     * @return void
     */
    private function seed_dashboards(): void {
        global $DB;

        foreach (['demo.student', 'demo.teacher'] as $username) {
            $userid = $this->users[$username];
            $usercontext = \core\context\user::instance($userid);
            $page = $DB->get_record('my_pages', ['userid' => $userid, 'name' => MY_PAGE_DEFAULT, 'private' => MY_PAGE_PRIVATE]);
            if (!$page) {
                $page = my_copy_page($userid, MY_PAGE_PRIVATE);
                // The copy brought the default page's blocks: on this demo page Compass stands alone.
                $copied = $DB->get_records('block_instances', ['parentcontextid' => $usercontext->id,
                    'pagetypepattern' => 'my-index', 'subpagepattern' => (string) $page->id]);
                foreach ($copied as $instance) {
                    blocks_delete_instance($instance);
                }
            }
            $exists = $DB->record_exists('block_instances', ['blockname' => 'compass', 'parentcontextid' => $usercontext->id,
                'pagetypepattern' => 'my-index', 'subpagepattern' => (string) $page->id]);
            if (!$exists) {
                $id = $DB->insert_record('block_instances', (object) [
                    'blockname' => 'compass',
                    'parentcontextid' => $usercontext->id,
                    'showinsubcontexts' => 0,
                    'requiredbytheme' => 0,
                    'pagetypepattern' => 'my-index',
                    'subpagepattern' => (string) $page->id,
                    'defaultregion' => 'content',
                    'defaultweight' => 0,
                    'configdata' => '',
                    'timecreated' => $this->now,
                    'timemodified' => $this->now,
                ]);
                \core\context\block::instance($id);
            }
        }
    }

    /**
     * Drop the demo users' Compass layers, so that the next page load reads the new data.
     *
     * @return void
     */
    private function purge_user_layers(): void {
        foreach ($this->users as $userid) {
            $courseids = \block_compass\local\inventory::cached_courseids($userid);
            \block_compass\local\inventory::delete($userid);
            \block_compass\local\details::delete_many($userid, $courseids);
            \block_compass\local\calendar_cache::delete($userid);
            \block_compass\local\news_cache::delete($userid);
        }
        \block_compass\local\catalogue_cache::delete();
        foreach ($this->courses as $course) {
            \block_compass\local\course_meta::delete((int) $course->id);
        }
    }
}
