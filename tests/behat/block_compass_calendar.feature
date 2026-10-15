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
    # Focus opens a day as hovering does (ADR-014 decision 9); the card is a dialog beside the row (amendment 12).
    When I set the focus on the "//section[contains(@class, 'compass-cal')]//button[contains(@aria-label, 'tomorrow')]" "xpath_element"
    Then I should see "Essay due" in the "//div[@role='dialog'][contains(@class, 'compass-cal-card')]" "xpath_element"
    And I should see "Add submission" in the "//div[@role='dialog'][contains(@class, 'compass-cal-card')]" "xpath_element"
    And the "Compass" "block" should meet accessibility standards with "best-practice" extra tests
    When I press the escape key
    Then "//div[@role='dialog'][contains(@class, 'compass-cal-card')]" "xpath_element" should not exist
    # The row scrolls across the whole window (ADR-014 amendment 12). Behat's Dashboard puts the block in
    # its drawer, under 640 px: a narrow strip, which by design has no arrows and no map. The keyboard and
    # Today move it: End takes the keyboard to the window's last day, and Today returns home. The strip's
    # own smooth scroll holds Moodle's pending counter until it settles.
    And "//section[contains(@class, 'compass-cal-narrow')]" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-edge')]" "xpath_element" should not exist
    And "//section[contains(@class, 'compass-cal')]//div[contains(@class, 'compass-cal-map')]" "xpath_element" should not exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-todaybtn')][@aria-disabled='true']" "xpath_element" should exist
    When I press the end key
    Then the focused element is "(//section[contains(@class, 'compass-cal')]//div[@role='listitem'])[last()]//button[contains(@class, 'compass-cal-day')]" "xpath_element"
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-todaybtn')][@aria-disabled='true']" "xpath_element" should not exist
    When I press the escape key
    And I click on "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-todaybtn')]" "xpath_element"
    Then "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-todaybtn')][@aria-disabled='true']" "xpath_element" should exist
    # Dark mode, Bootstrap's colour-mode attribute (Moodle 5.2's one mechanism): the cards' outline
    # button and the strip's marks take the block's dark-aware ink, and axe passes over the block.
    When the page is shown in the dark colour mode
    Then the "Compass" "block" should meet accessibility standards with "best-practice" extra tests
    # The block's own page gives the strip its width (ADR-014 amendment 12): the arrows float over the row's
    # ends and the map scrubs under it. The strip opens as the viewer left it, open. End reaches the window's
    # last day and Later days says it can go no further; Earlier days steps back; Today returns home.
    And the following config values are set as admin:
      | enable_page | 1 | block_compass |
    When I visit "/blocks/compass/index.php"
    Then "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-toggle')][@aria-expanded='true']" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@aria-label, 'tomorrow')]" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal-narrow')]" "xpath_element" should not exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-edge-prev')][not(@aria-disabled)]" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-edge-next')][not(@aria-disabled)]" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal')]//div[contains(@class, 'compass-cal-map')][@aria-hidden='true']" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-todaybtn')][@aria-disabled='true']" "xpath_element" should exist
    And the ".compass-page" "css_element" should meet accessibility standards with "best-practice" extra tests
    When I set the focus on the "//section[contains(@class, 'compass-cal')]//button[contains(@aria-label, 'tomorrow')]" "xpath_element"
    And I press the escape key
    Then "//div[@role='dialog'][contains(@class, 'compass-cal-card')]" "xpath_element" should not exist
    When I press the end key
    Then "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-edge-next')][@aria-disabled='true']" "xpath_element" should exist
    And "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-todaybtn')][@aria-disabled='true']" "xpath_element" should not exist
    When I click on "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-edge-prev')]" "xpath_element"
    Then "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-edge-next')][@aria-disabled='true']" "xpath_element" should not exist
    When I click on "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-todaybtn')]" "xpath_element"
    Then "//section[contains(@class, 'compass-cal')]//button[contains(@class, 'compass-cal-todaybtn')][@aria-disabled='true']" "xpath_element" should exist
