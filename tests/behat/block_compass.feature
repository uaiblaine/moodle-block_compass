@block @block_compass @javascript
Feature: The Compass block puts the courses that need attention first
  In order to get back to the course I am working on
  As a student
  I need the Compass block to separate what I have opened from what I have not

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | One      | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
      | Course 2 | C2        |
      | Course 3 | C3        |
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
