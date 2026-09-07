@block @block_compass @javascript
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
    And I should see "Continue where you left off" in the "Compass" "block"
    And I should see "Course 1" in the "Compass" "block"
    And I should see "New enrolments" in the "Compass" "block"
    And I should see "Course 2" in the "Compass" "block"

  Scenario: The courses that do not fit the strips are counted, not listed
    Given the following config values are set as admin:
      | attention_max | 1 | block_compass |
    And I am on the "C1" "Course" page logged in as "student1"
    And I follow "Dashboard"
    And I turn editing mode on
    And I add the "Compass" block
    And I turn editing mode off
    Then I should see "Course 1" in the "Compass" "block"
    And I should see "other courses" in the "Compass" "block"

  @javascript
  Scenario: The ghost card opens the grouped course list and the search box filters it in place
    Given the following config values are set as admin:
      | attention_max | 1 | block_compass |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 4 | C4        | CATB     |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C4     | student |
    # Seeded so that tier 1 is decided rather than guessed: with one card per strip, Continue is
    # Course 1 (opened last, in the step below) and New is Course 4, the only course never opened.
    # Courses 2 and 3 are therefore absent from tier 1, which is what makes the search assertion
    # at the end about tier 3 and nothing else.
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
    Then I should see "All courses (4)" in the "Compass" "block"
    And I should see "Cat A" in the "Compass" "block"
    And I should see "Cat B" in the "Compass" "block"
    And I should see "Course 2" in the "Compass" "block"
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
    # that failed to persist it would look perfectly correct until the next page load.
    When I click on "Cards" "button" in the "Compass" "block"
    Then ".compass-rowcard" "css_element" should exist in the "Compass" "block"
    When I reload the page
    And I click on "Explore all" "button"
    Then ".compass-rowcard" "css_element" should exist in the "Compass" "block"

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
    And I click on "Unarchive Course 2" "button" in the "Compass" "block"
    # The announcement is made only after the write has been awaited, so waiting for it is
    # waiting for the row to be gone - navigating away on the click would race the write.
    And I should see "Course 2 brought back" in the "Compass" "block"
    And I am on the "My courses" page
    And I click on "Removed from view" "button" in the "Course overview" "block"
    And I click on "All" "link" in the "Course overview" "block"
    Then I should see "Course 2" in the "Course overview" "block"
