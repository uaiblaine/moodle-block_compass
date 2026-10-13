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

  Scenario: A day of the strip opens a card with the assignment and core's action, and Escape closes it
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
