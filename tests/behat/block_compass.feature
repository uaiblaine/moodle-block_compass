@block @block_compass @javascript
Feature: The Compass block can be added to the Dashboard
  In order to see my courses by relevance
  As a student
  I need to add the Compass block to my Dashboard

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | One      | student1@example.com |

  Scenario: A student adds the block to their Dashboard and sees it render
    Given I log in as "student1"
    And I turn editing mode on
    And I add the "Compass" block
    Then "Compass" "block" should exist
    And I should see "Your courses will appear here." in the "Compass" "block"
