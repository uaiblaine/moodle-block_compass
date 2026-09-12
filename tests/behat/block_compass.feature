@block @block_compass @javascript @accessibility
Feature: The Compass block puts the courses that need attention first
  In order to get back to the course I am working on
  As a student
  I need the Compass block to separate what I have opened from what I have not

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | One      | student1@example.com |
    And the following "categories" exist:
      | name  | category | idnumber |
      | Cat A | 0        | CATA     |
      | Cat B | 0        | CATB     |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | CATA     |
      | Course 2 | C2        | CATA     |
      | Course 3 | C3        | CATA     |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
      | student1 | C3     | student |

  Scenario: The course I opened leads, and the ones I never opened are new enrolments
    Given I am on the "C1" "Course" page logged in as "student1"
    And I follow "Dashboard"
    And I turn editing mode on
    And I add the "Compass" block
    And I turn editing mode off
    Then "Compass" "block" should exist
    # The top of the body announces the client's seven modules where the block is (ADR-011,
    # decision 2; ADR-012, decision 4): a seventh modulepreload link exists and an eighth does not.
    And "//link[@rel='modulepreload'][7]" "xpath_element" should exist
    And "//link[@rel='modulepreload'][8]" "xpath_element" should not exist
    And I should see "Continue where you left off" in the "Compass" "block"
    And I should see "Course 1" in the "Compass" "block"
    And I should see "New enrolments" in the "Compass" "block"
    And I should see "Course 2" in the "Compass" "block"
    # The audit is a gate, not a document (ADR-008, decision 1): core's axe step, scoped to this
    # block, rides inside each scenario at the point where the most is on screen. The feature
    # carries @accessibility, which the step demands, and axe is on by default in the run config.
    And the "Compass" "block" should meet accessibility standards with "best-practice" extra tests

  Scenario: The courses that do not fit the strips are counted, not listed
    # Without its title bar the block has no h3 of core's, so the plugin's own headings move
    # one rung up (ADR-008, decision 3) - and this is the one scenario that measures that
    # configuration with axe. The block is still found by "Compass": core puts the plugin
    # name in the section's aria-label when the title is empty (blocks/moodleblock.class.php).
    Given the following config values are set as admin:
      | attention_max    | 1 | block_compass |
      | hide_block_title | 1 | block_compass |
    And I am on the "C1" "Course" page logged in as "student1"
    And I follow "Dashboard"
    And I turn editing mode on
    And I add the "Compass" block
    And I turn editing mode off
    Then I should see "Course 1" in the "Compass" "block"
    And I should see "other courses" in the "Compass" "block"
    And the "Compass" "block" should meet accessibility standards with "best-practice" extra tests

  @javascript
  Scenario: The ghost card opens the grouped course list, the panel filters it by a course field and the search box filters it in place
    Given the following config values are set as admin:
      | attention_max | 1        | block_compass |
      | filter_fields | delivery | block_compass |
    # A select course custom field, visible to everyone, is what the filter panel draws a chip
    # group for (ADR-009, decision 5); seeded with core's own generators, and the value with the
    # course, the way create_course() saves custom fields.
    And the following "custom field categories" exist:
      | name        | component   | area   | itemid |
      | Course tags | core_course | course | 0      |
    And the following "custom fields" exist:
      | name     | category    | type   | shortname | configdata                                    |
      | Delivery | Course tags | select | delivery  | {"options":"Online\nOn campus\nHybrid","visibility":2} |
    And the following "courses" exist:
      | fullname | shortname | category | customfield_delivery |
      | Course 4 | C4        | CATB     | 1                    |
      | Course 5 | C5        | CATB     | 2                    |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C4     | student |
      | student1 | C5     | student |
    # Seeded so that tier 1 is decided rather than guessed: with one card per strip, Continue is
    # Course 1 (opened last, in the step below) and New shows Course 4 - Courses 4 and 5 are the
    # two never opened, enrolled in the same second, so the name breaks the tie - with a "+1 new"
    # link in its heading for Course 5 (ADR-009, decision 2). Courses 2 and 3 are therefore absent
    # from tier 1, which is what makes the search assertion below about tier 3 and nothing else.
    And the following "last access times" exist:
      | user     | course | lastaccess     |
      | student1 | C2     | ##3 days ago## |
      | student1 | C3     | ##4 days ago## |
    And I am on the "C1" "Course" page logged in as "student1"
    And I follow "Dashboard"
    And I turn editing mode on
    And I add the "Compass" block
    And I turn editing mode off
    # This click is also the only end-to-end proof that React mounted (ADR-006, R1). The
    # tier 2 ghost is a React component; the fallback the mount point carries states the
    # count and is a div with no call to action, so "Explore all" exists as a button only
    # once the component is running. A failed import is silent everywhere else.
    When I click on "Explore all" "button"
    Then I should see "All courses (5)" in the "Compass" "block"
    And I should see "Cat A" in the "Compass" "block"
    And I should see "Cat B" in the "Compass" "block"
    And I should see "Course 2" in the "Compass" "block"
    # The filter panel is open at first render, so its platters and chips are on screen too - all
    # but the chip nobody's course carries: a chip that would show nothing is not drawn (ADR-010,
    # decision 3). Hybrid is the third option of the field and no course has it.
    And I should see "Delivery" in the "Compass" "block"
    And I should see "On campus" in the "Compass" "block"
    And I should not see "Hybrid" in the "Compass" "block"
    # With tier 3 open: the index, both groups and their rows, the toolbar and the panel are all
    # on screen here, which is the most this scenario ever shows (a settled search narrows the
    # list to its hits).
    And the "Compass" "block" should meet accessibility standards with "best-practice" extra tests
    # A field chip narrows the list to the one course carrying the option, in the browser: the
    # live region announces the count, which is what settles the re-render before the negative
    # assertion runs (Course 5 is not in tier 1, so its absence is tier 3's).
    When I click on "Online" "button" in the "Compass" "block"
    Then I should see "1 courses shown" in the "Compass" "block"
    And I should see "Course 4" in the "Compass" "block"
    And I should not see "Course 5" in the "Compass" "block"
    When I click on "Clear filters" "button" in the "Compass" "block"
    Then I should see "5 courses shown" in the "Compass" "block"
    When I set the field "Search my courses" to "Course 4"
    # The count settles the race before the negative assertion runs. Searching is debounced,
    # and "should not see" fails the instant it finds the text rather than waiting for it to
    # go - so asserting the absence first only passes when the typing happens to outrun the
    # debounce. The live region says how many rows survived the filter, so waiting for it is
    # waiting for the filter itself. (Course 4 is also in tier 1, so asserting it proves
    # nothing about tier 3 either way.)
    Then I should see "1 courses shown" in the "Compass" "block"
    And I should see "Course 4" in the "Compass" "block"
    And I should not see "Course 2" in the "Compass" "block"
    # The cards are a second component tree over the same rows, and in React a defect in one
    # unmounts the whole block rather than drawing a broken card - so this is the only place
    # that would notice. The reload is what proves the choice was WRITTEN: it goes through
    # core's own preferences endpoint, a route nothing else in this plugin uses, and a client
    # that failed to persist it would look perfectly correct until the next page load. The
    # switch is an icon-only button now, found by the aria-label carrying the word (ADR-009).
    When I click on "Cards" "button" in the "Compass" "block"
    Then ".compass-rowcard" "css_element" should exist in the "Compass" "block"
    # The cards are a grid whose column count the client sets from the width it has (ADR-010,
    # decision 4). Here the block sits in the Dashboard's block drawer, about 315 px wide and
    # under the 640 px the index needs, so the narrow rule is what this page measures: one
    # column, and no index. The two- and three-column rules are pinned by the static test.
    And ".compass-rowcards-1" "css_element" should exist in the "Compass" "block"
    When I reload the page
    # The strip's heading link is the second way into tier 3 (ADR-009, decision 2): it opens on
    # the New chip, so the two never-opened courses are what is counted, and the cards view
    # written before the reload is what draws them.
    And I click on "+1 new" "button" in the "Compass" "block"
    Then I should see "2 courses shown" in the "Compass" "block"
    And ".compass-rowcard" "css_element" should exist in the "Compass" "block"
    # A gesture that opens tier 3 also moves the keyboard there (ADR-010, decision 1): the section
    # takes focus, so the next Tab lands on its toolbar and not back at the top of the block.
    And the focused element is ".compass-explore" "css_element"

  @javascript
  Scenario: Archiving in Compass removes the course from the Course overview block, and unarchiving brings it back
    # The fourth scenario, written into ADR-007 before the code existed: the acceptance criterion
    # of Phase 5 is cross-plugin and browser-only, so no PHPUnit test can stand in for it.
    # attention_max 1 is what makes the ghost exist: with the default three, the Background's
    # three courses all fit in tier 1 and there is no "Explore all" to open tier 3 with.
    Given the following config values are set as admin:
      | enablemycourses | 1 |             |
      | attention_max   | 1 | block_compass |
    # A fourth course keeps the ghost alive AFTER the archive: with three, archiving one leaves
    # two, one per strip, nothing over, and no "Explore all" to reopen tier 3 with.
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 4 | C4        | CATB     |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C4     | student |
    And I am on the "C1" "Course" page logged in as "student1"
    And I follow "Dashboard"
    And I turn editing mode on
    And I add the "Compass" block
    And I turn editing mode off
    When I click on "Explore all" "button"
    And I click on "Archive Course 2" "button" in the "Compass" "block"
    # The count is what settles the write before anything is asserted about absence, the way
    # the search scenario waits for the live region rather than racing a debounce.
    Then I should see "Archived" in the "Compass" "block"
    And I should see "1 courses" in the "//details[contains(@class, 'compass-group')][.//span[contains(@class, 'compass-group-name') and text()='Archived']]" "xpath_element"
    And I am on the "My courses" page
    And I should not see "Course 2" in the "Course overview" "block"
    # Core's own filter is what proves the row is core's, not a second store of our own.
    And I click on "All" "button" in the "Course overview" "block"
    And I click on "Removed from view" "link" in the "Course overview" "block"
    And I should see "Course 2" in the "Course overview" "block"
    # "Dashboard" is not a core page type for the "I am on the ... page" step; the nav link is.
    When I follow "Dashboard"
    And I click on "Explore all" "button"
    And I click on "Archived" "text" in the "Compass" "block"
    # With the Archived group open: axe cannot see inside a closed details, so this is the one
    # point in the feature where its rows and their controls are measured.
    And the "Compass" "block" should meet accessibility standards with "best-practice" extra tests
    # The archive's rows are held once fetched and filtered in the browser like every other
    # group's (ADR-007, amendment 3): a query nothing archived matches empties the group, and
    # clearing it brings the row back. The first version fetched the archive with the toolbar
    # of that moment as server parameters and never looked at the rows again, so after a search
    # the group stayed empty for the rest of the page's life.
    When I set the field "Search my courses" to "zzz"
    Then I should see "0 courses" in the "//details[contains(@class, 'compass-group')][.//span[contains(@class, 'compass-group-name') and text()='Archived']]" "xpath_element"
    # And a query the archived course does match keeps it: the name map the matcher reads must
    # know the archive's rows too, or they would match nothing whatever their name.
    When I set the field "Search my courses" to "Course 2"
    Then I should see "1 courses" in the "//details[contains(@class, 'compass-group')][.//span[contains(@class, 'compass-group-name') and text()='Archived']]" "xpath_element"
    And I should see "Course 2" in the "//details[contains(@class, 'compass-group')][.//span[contains(@class, 'compass-group-name') and text()='Archived']]" "xpath_element"
    When I set the field "Search my courses" to ""
    # Clearing the search puts the groups above back the way they were, 150 ms later, and the
    # page shifts under the next click: the button is located, the groups reopen, and the click
    # lands on a course link that has moved into its place (measured: the page went to Course 1).
    # The announced count is the one thing that changes only once the cleared query has been
    # applied - three listed courses plus the archived one, held and counted - so waiting for it
    # is waiting for the layout to settle.
    Then I should see "4 courses shown" in the "Compass" "block"
    And I should see "1 courses" in the "//details[contains(@class, 'compass-group')][.//span[contains(@class, 'compass-group-name') and text()='Archived']]" "xpath_element"
    And I should see "Course 2" in the "//details[contains(@class, 'compass-group')][.//span[contains(@class, 'compass-group-name') and text()='Archived']]" "xpath_element"
    And I click on "Unarchive Course 2" "button" in the "Compass" "block"
    # The announcement is made only after the write has been awaited, so waiting for it is
    # waiting for the row to be gone - navigating away on the click would race the write.
    And I should see "Course 2 brought back" in the "Compass" "block"
    And I am on the "My courses" page
    And I click on "Removed from view" "button" in the "Course overview" "block"
    And I click on "All" "link" in the "Course overview" "block"
    Then I should see "Course 2" in the "Course overview" "block"

  @javascript
  Scenario: The Compass page shows the block alone, and can be the start page
    # The fifth scenario, granted for ADR-012: the block's own page is a browser-only surface -
    # a layout with no regions, the theme's heading, core's head hook - and nothing in PHPUnit
    # loads a page. The page is behind a setting, off by default (decision 1).
    Given the following config values are set as admin:
      | enable_page | 1 | block_compass |
    And I am on the "C1" "Course" page logged in as "student1"
    When I visit "/blocks/compass/index.php"
    # The theme's own heading is the block's name, and under it the block's content with its
    # sections one rung down (decision 2); no block drawer, because the base layout has no
    # regions, and no block instance, because the page renders the block's shell itself.
    Then I should see "Compass" in the "#page-header" "css_element"
    And I should see "Continue where you left off" in the ".compass-page" "css_element"
    And I should see "Course 1" in the ".compass-page" "css_element"
    And "#theme_boost-drawers-blocks" "css_element" should not exist
    And "Compass" "block" should not exist
    And "//link[@rel='modulepreload'][7]" "xpath_element" should exist
    And the ".compass-page" "css_element" should meet accessibility standards with "best-practice" extra tests
    # As the site's start page (decision 3): the site root lands on the page, through core's own
    # redirect for a URL home page, with the value the hook offered as the setting's key.
    And the following config values are set as admin:
      | defaulthomepage | /blocks/compass/index.php |
    When I am on site homepage
    Then I should see "Compass" in the "#page-header" "css_element"
    And I should see "Course 1" in the ".compass-page" "css_element"
    # With the title hidden (amendment 4) the theme's header holds no heading; the page keeps
    # its h1, visually hidden by core's own class, at the top of the content, and axe with the
    # best-practice rules still passes over it.
    And the following config values are set as admin:
      | hide_page_title | 1 | block_compass |
    And I reload the page
    Then I should not see "Compass" in the "#page-header" "css_element"
    And "#page-header h1" "css_element" should not exist
    And ".compass-page h1.visually-hidden" "css_element" should exist
    And I should see "Continue where you left off" in the ".compass-page" "css_element"
    And the ".compass-page" "css_element" should meet accessibility standards with "best-practice" extra tests
