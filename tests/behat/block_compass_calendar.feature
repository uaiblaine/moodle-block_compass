@block @block_compass @javascript @accessibility
Feature: The calendar strip above the Compass cards shows what falls due, day by day
  In order to see what is due before I open a course
  As a student
  I need the strip to open a day and show its items with core's own action

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | One      | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity | course | name      | idnumber | duedate           | assignsubmission_onlinetext_enabled |
      | assign   | C1     | Essay due | essay1   | ##tomorrow noon## | 1                                   |

  Scenario: A day of the strip opens a card with core's action, Escape closes it, and the strip stays readable and clickable
    Given the following config values are set as admin:
      | calendar_enabled | 1 | block_compass |
    And I am on the "C1" "Course" page logged in as "student1"
    And I follow "Dashboard"
    And I turn editing mode on
    And I add the "Compass" block
    And I turn editing mode off
    Then "Compass" "block" should exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@aria-label, 'tomorrow')]" "xpath_element" should exist
    # Focus opens a day as hovering does (ADR-014 decision 9); the card is a dialog in the day's column.
    When I set the focus on the "//section[contains(@class, 'compass-cal')]//button[contains(@aria-label, 'tomorrow')]" "xpath_element"
    Then I should see "Essay due" in the "//div[@role='dialog'][contains(@class, 'compass-cal-card')]" "xpath_element"
    And I should see "Add submission" in the "//div[@role='dialog'][contains(@class, 'compass-cal-card')]" "xpath_element"
    And the "Compass" "block" should meet accessibility standards with "best-practice" extra tests
    When I press the escape key
    Then "//div[@role='dialog'][contains(@class, 'compass-cal-card')]" "xpath_element" should not exist
    # Dark mode, Bootstrap's colour-mode attribute (Moodle 5.2's one mechanism): the cards' outline
    # button and the strip's marks take the block's dark-aware ink, and axe passes over the block.
    When the page is shown in the dark colour mode
    Then the "Compass" "block" should meet accessibility standards with "best-practice" extra tests
    # Without the page title the reload control sits in the page's top-right corner, where the
    # strip's header lies: it must take the click, and WebDriver refuses a click another element
    # would receive.
    And the following config values are set as admin:
      | enable_page     | 1 | block_compass |
      | hide_page_title | 1 | block_compass |
    And I visit "/blocks/compass/index.php"
    And "//section[contains(@class, 'compass-cal')]//button[contains(@aria-label, 'tomorrow')]" "xpath_element" should exist
    When I click on "Reload courses" "button" in the ".compass-page" "css_element"
    Then I should see "Course 1" in the ".compass-page" "css_element"
