package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.utils.XMLHierarchy;
import org.json.JSONException;
import org.w3c.dom.Document;

import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringWriter;
import java.util.Hashtable;

/**
 * Get page source. Return as string of XML doc
 */
public class Source extends CommandHandler {
  @Override
  public AndroidCommandResult execute(AndroidCommand command) throws JSONException {
    final Hashtable<String, Object> params = command.params();

    boolean xpathCompression = XMLHierarchy.DEFAULT_XPATH_COMPRESSION_SETTING;
    if (params.containsKey("xpathCompression")) {
      xpathCompression = (Boolean) params.get("xpathCompression");
    }

    Document doc = (Document) XMLHierarchy.getFormattedXMLDoc(xpathCompression);

    TransformerFactory tf = TransformerFactory.newInstance();
    StringWriter writer = new StringWriter();
    Transformer transformer;
    String xmlString;


    try {
      transformer = tf.newTransformer();
      transformer.transform(new DOMSource(doc), new StreamResult(writer));
      xmlString = writer.getBuffer().toString();

    } catch (TransformerConfigurationException e) {
      e.printStackTrace();
      throw new RuntimeException("Something went terribly wrong while converting xml document to string");
    } catch (TransformerException e) {
      return getErrorResult("Could not parse xml hierarchy to string: " + e.getMessage());
    }

    return getSuccessResult(xmlString);
  }
}
