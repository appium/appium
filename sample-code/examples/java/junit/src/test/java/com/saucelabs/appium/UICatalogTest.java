package com.saucelabs.appium;

import org.junit.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.Point;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

import java.util.List;

import static org.junit.Assert.*;

/**
 * @author Ross Rowe
 */
public class UICatalogTest {

    private WebDriver driver;

    private WebElement row;

    private void openMenuPosition(int index) {

        //populate text         fields with         two random         number
        WebElement table = driver.findElement(By.tagName("tableView"));
        row = table.findElements(By.tagName("tableCell")).get(index);
        row.click();

    }

    @Test
    public void findElement() throws Exception {
        //first view in UICatalog is a table
        WebElement table = driver.findElement(By.tagName("tableView"));
        assertNotNull(table);
        //is number of cells/rows inside table correct
        List<WebElement> rows = table.findElements(By.tagName("tableCell"));
        assertEquals(12, rows.size());
        //is first one about buttons
        assertEquals(rows.get(0).getText(), "Buttons, Various uses of UIButton");
        //navigationBar is not inside table
        WebElement nav_bar = table.findElement(By.tagName("navigationBar"));
        assertNull(nav_bar);
        //there is nav bar inside the app
        nav_bar = driver.findElement(By.tagName("navigationBar"));
        assertNotNull(nav_bar);
    }


    @Test
    public void test_location() {
        //get third row location
        row = driver.findElements(By.tagName("tableCell")).get(2);
        assertEquals(row.getLocation().getX(), 0);
        assertEquals(row.getLocation().getY(), 152);
    }

    @Test
    public void testScreenshot() {
        //make screenshot and get is as base64
        screenshot = driver.get_screenshot_as_base64()
        self.assertTrue(screenshot)
        //make screenshot and save it to the local filesystem
                success = self.driver.get_screenshot_as_file("foo.png")
        self.assertTrue(success)
    }

    @Test
    public void testAttributes() {
        //go to the toolbar section
        openMenuPosition(9);

        WebElement segmented_control = driver.findElement(By.tagName("segmentedControl"));
        //segmented_control is enabled by default
        assertTrue(segmented_control.isEnabled());
        assertTrue(segmented_control.isDisplayed());
        //row is from previous view, should not be visible
        assertFalse(row.isDisplayed());

        WebElement tinted_switch = driver.findElements(By.tagName("switch")).get(1);
        assertEquals(tinted_switch.getText(), "Tinted");
        //check if it is in "off" position
        assertEquals(Integer.valueOf(tinted_switch.getAttribute("value")), new Integer(0));
        tinted_switch.click();
        //check if it is in "on" position
        assertEquals(Integer.valueOf(tinted_switch.getAttribute("value")), new Integer(1));
        //segmented_control should now be disabled
        assertFalse(segmented_control.isEnabled());
    }

    @Test
    public void testTextFieldEdit() {
        //go to the text fields section
        openMenuPosition(2);
        WebElement text_field = driver.findElements(By.tagName("textField")).get(0);
        //get default/empty text
        String default_val = text_field.getAttribute("value");
        //write some random text to element
        String rnd_string = str_generator();
        text_field.sendKeys(rnd_string);
        assertEquals(text_field.getAttribute("value"), rnd_string);
        //send some random keys
        String rnd_string2 = str_generator()
        swipe = ActionChains(self.driver).send_keys(rnd_string2)
        swipe.perform()
        //check if text is there
        assertEquals(text_field.getAttribute("value"), rnd_string2);
        //clear
        text_field.clear();
        //check if is empty/has default text
        assertEquals(text_field.getAttribute("value"), default_val);
    }

    @Test
    public void testAlertInteraction() {
        //go to the alerts section
        openMenuPosition(10);
        List<WebElement> elements = driver.findElements(By.tagName("staticText"));


        //trigger modal alert with cancel & ok buttons
        WebElement triggerOkCancel = elements.get(14);
        triggerOkCancel.click();
        WebElement alert = driver.switchTo();
        //check if title of alert is correct
        assertEquals(alert.getText(), "UIAlertView");
        alert.accept();
    }

    @Test
    public void testScroll() {
        //scroll menu
        //get initial third row location
        row = driver.findElements(By.tagName("tableCell")).get(2);
        Point location1 = row.getLocation();
        //perform swipe gesture
        swipe = TouchActions(self.driver).flick(0, -20);
        swipe.perform()
        //get new row coordinates
        Point location2 = row.getLocation();
        assertEquals(location1.getX(), location2.getX());
        assertNotSame(location1.getY(), location2.getY());
    }

    @Test
    public void testSlider() {
        //go to controls
        openMenuPosition(1);
        //get the slider
        WebElement slider = driver.findElement(By.tagName("slider"));
        assertEquals(slider.getAttribute("value"), "50%");
        drag = TouchActions(self.driver)
        drag.flick_element(slider, -0.5, 0, 0)
        drag.perform()
        assertEquals(slider.getAttribute("value"), "0%");
    }

    @Test
    public void testSessions() {
        data = json.loads(urllib2.urlopen("http://localhost:4723/wd/hub/sessions").read())
        self.assertEqual(self.driver.session_id, data[0]['id'])
    }

    @Test
    public void testSize() {
        table = driver.find_element_by_tag_name("tableView").size
        row = driver.find_elements_by_tag_name("tableCell")[0].size
        assertEquals(table['width'], row['width'])
        assertNotSame(table['height'], row['height'])
    }

    @Test
    public void testSource() {
        //get main view soruce
        String source_main = driver.getPageSource();
        assertTrue(source_main.contains("UIATableView"));
        assertTrue(source_main.contains("TextFields, Uses of UITextField");

        //got to text fields section
        openMenuPosition(2);
        String source_textfields = driver.getPageSource();
        assertTrue(source_textfields.contains("UIAStaticText"));
                assertTrue(source_textfields.contains("TextFields");

        assertNotSame(source_main, source_textfields);
    }
}
