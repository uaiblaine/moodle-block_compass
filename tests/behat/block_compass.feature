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
