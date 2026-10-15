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

  Scenario: The strip starts closed with plain counts, offers a way back only when opening fails, and opens a day with core's action
    Given the following config values are set as admin:
      | calendar_enabled | 1 | block_compass |
    And I am on the "C1" "Course" page logged in as "student1"
    And I follow "Dashboard"
    And I turn editing mode on
    And I add the "Compass" block
    And I turn editing mode off
    Then "Compass" "block" should exist
    # Closed by default (calendar_start): the toggle collapsed, a line of plain counts by period, no row
    # of days, and no reload or retry control while nothing has failed (ADR-014 amendment 11).
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-toggle')][@aria-expanded='false']" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@aria-label, 'Tomorrow: 1 item.')]" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal')]//div[contains(@class, 'compass-cal-days')]" "xpath_element" should not exist
    And "Try again" "button" should not exist in the "Compass" "block"
    And the "Compass" "block" should meet accessibility standards with "best-practice" extra tests
    # Opening fails at the transport: the way back appears only now, and it brings the row of days.
    When the calendar strip requests fail
    And I click on "Calendar" "button" in the "Compass" "block"
    Then I should see "The calendar strip could not be loaded." in the "Compass" "block"
    And "Reload page" "button" should exist in the "Compass" "block"
    When the calendar strip requests answer again
    And I click on "Try again" "button" in the "Compass" "block"
    Then "//section[contains(@class, 'compass-cal')]//button[contains(@aria-label, 'tomorrow')]" "xpath_element" should exist
    And "Try again" "button" should not exist in the "Compass" "block"
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-toggle')][@aria-expanded='true']" "xpath_element" should exist
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
