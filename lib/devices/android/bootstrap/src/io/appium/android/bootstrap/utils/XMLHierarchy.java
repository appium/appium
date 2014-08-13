package io.appium.android.bootstrap.utils;

import android.os.Environment;
import com.android.uiautomator.core.UiDevice;
import io.appium.android.bootstrap.exceptions.ElementNotFoundException;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.*;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.HashMap;


/**
 * Created by jonahss on 8/12/14.
 */
public abstract class XMLHierarchy {

  // Note that
  // "new File(new File(Environment.getDataDirectory(), "local/tmp"), fileName)"
  // is directly from the UiDevice.java source code.
  private static final File dumpFolder = new File(Environment.getDataDirectory(), "local/tmp");
  private static final String dumpFileName = "dump.xml";
  private static final File dumpFile = new File(dumpFolder, dumpFileName);

  public static ArrayList<ClassInstancePair> getClassInstancePairs(XPathExpression xpathExpression) throws ElementNotFoundException, XPathExpressionException, ParserConfigurationException {
    return getClassInstancePairs(xpathExpression, getFormattedXMLRoot());
  }

  public static ArrayList<ClassInstancePair> getClassInstancePairs(XPathExpression xpathExpression, Node root) throws ElementNotFoundException {
    XPath xpath = XPathFactory.newInstance().newXPath();
    NodeList nodes;
    try {
      nodes = (NodeList) xpathExpression.evaluate(root, XPathConstants.NODESET);
    } catch (XPathExpressionException e) {
      e.printStackTrace();
      throw new ElementNotFoundException("XMLWindowHierarchy could not be parsed: " + e.getMessage());
    }

    ArrayList<ClassInstancePair> pairs = new ArrayList<ClassInstancePair>();
    for (int i = 0; i < nodes.getLength(); i++) {
      if (nodes.item(i).getNodeType() == Node.ELEMENT_NODE) {
        pairs.add(getPairFromNode(nodes.item(i)));
      }
    }

    return pairs;
  }

  public static InputSource getRawXMLHierarchy() throws ElementNotFoundException {
    dumpFolder.mkdirs();

    deleteDumpFile();

    //compression off by default TODO add this as a config option
    NotImportantViews.discard(false);

    try {
      // dumpWindowHierarchy often has a NullPointerException
      UiDevice.getInstance().dumpWindowHierarchy(dumpFileName);
    } catch (Exception e) {
      e.printStackTrace();
      // If there's an error then the dumpfile may exist and be empty.
      deleteDumpFile();
    }

    try {
      return new InputSource(new FileReader(dumpFile));
    } catch (FileNotFoundException e) {
      e.printStackTrace();
      throw new ElementNotFoundException("Failed to Dump Window Hierarchy");
    }
  }

  public static Node getFormattedXMLRoot() throws ElementNotFoundException, XPathExpressionException, ParserConfigurationException {
    XPath xpath = XPathFactory.newInstance().newXPath();

    Node root = (Node) xpath.evaluate("/", getRawXMLHierarchy(), XPathConstants.NODE);

    //rename all the nodes with their "class" attribute
    //add an instance attribute

    HashMap<String, Integer> instances = new HashMap<String, Integer>();
    annotateNodes(root, instances);

    return root;
  }


  private static ClassInstancePair getPairFromNode(Node node) {

    NamedNodeMap attrElements = node.getAttributes();
    String androidClass = attrElements.getNamedItem("class").getNodeValue();
    String instance = attrElements.getNamedItem("instance").getNodeValue();

    return new ClassInstancePair(androidClass, instance);
  }

  private static void annotateNodes(Node node, HashMap<String, Integer>instances) {
    NodeList children = node.getChildNodes();
    for (int i = 0; i < children.getLength(); i++) {
      if (children.item(i).getNodeType() == Node.ELEMENT_NODE) {
        visitNode(children.item(i), instances);
        annotateNodes(children.item(i), instances);
      }
    }
  }

  private static void visitNode(Node node) {
    node.
  }

  private static void deleteDumpFile() {
    if (dumpFile.exists()) {
      dumpFile.delete();
    }
  }
}
