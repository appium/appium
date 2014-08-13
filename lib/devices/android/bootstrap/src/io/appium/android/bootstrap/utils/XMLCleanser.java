package io.appium.android.bootstrap.utils;

import java.io.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class XMLCleanser {

  //
  private static Pattern pattern = Pattern.compile("(<\\S*)(\\s*[#\\$]+[#\\$\\s]*)(\\S*>)");
  private static Matcher matcher = pattern.matcher("");


  public static void cleanFile(File dumpFile) throws IOException {
    // the xml for windowHierarchy is all on one line. Adding newlines and rewriting to a file is probably just as
    // inefficient as reading the whole file into memory for when we cleanse it

    BufferedReader reader = new BufferedReader(new FileReader(dumpFile));
    String line, wholeFile = "";
    while ((line = reader.readLine()) != null) {
      line = cleanLine(line);
      wholeFile = wholeFile + line;
    }
    reader.close();

    BufferedWriter writer = new BufferedWriter(new FileWriter(dumpFile));
    writer.write(wholeFile);
    writer.close();

  }

  public static String cleanLine(String line) {

   matcher.reset(line);
   return matcher.replaceAll("$1.$3");
  }

}