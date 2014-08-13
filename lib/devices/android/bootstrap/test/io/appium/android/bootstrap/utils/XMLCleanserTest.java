package io.appium.android.bootstrap.utils;

import junit.framework.TestCase;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class XMLCleanserTest extends TestCase {

  public void testCleanLine() throws Exception {
    String[] invalids = {"<android$tab>", "<android $ tab>", "<android  $  tab>", "<android $# tab>", "<android $ # tab>"};
    String[] invalidsClosing = {"</android$tab>", "</android $ tab>"};
    String[] valids = {"<android.tab>", "<androidtab>", "<androidtab    >", "android$tab", "android $ tab"};
    String[] combos = {"<foo>ba$r<android.tab><baz>", "<foo>ba$r<android$tab><baz>"};


    Pattern pattern = Pattern.compile("(<[^>].*)(\\$)(.*[^<]>)");
    Matcher matcher = pattern.matcher("<android$tab>");
    assertEquals("<android.tab>", matcher.replaceAll("$1.$3"));



    for (String valid : valids) {
      assertEquals(valid, valid, XMLCleanser.cleanLine(valid));
    }

    for (String invalid : invalids) {
      assertEquals(invalid, "<android.tab>", XMLCleanser.cleanLine(invalid));
    }

    for (String invalid : invalidsClosing) {
      assertEquals(invalid,  "</android.tab>", XMLCleanser.cleanLine(invalid));
    }

    for (String invalid : combos) {
      assertEquals(invalid,  "<foo>ba$r<android.tab><baz>", XMLCleanser.cleanLine(invalid));
    }

    assertEquals("<android.foo.tab", XMLCleanser.cleanLine("<android$foo$tab"));

  }
}