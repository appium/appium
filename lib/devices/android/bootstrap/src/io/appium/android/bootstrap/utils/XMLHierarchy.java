package io.appium.android.bootstrap.utils;

import android.graphics.Point;
import android.os.Environment;
import android.view.Display;
import android.view.accessibility.AccessibilityNodeInfo;
import io.appium.android.bootstrap.exceptions.ElementNotFoundException;
import io.appium.android.bootstrap.exceptions.InvalidSelectorException;
import io.appium.android.bootstrap.exceptions.PairCreationException;
import io.appium.uiautomator.core.AccessibilityNodeInfoDumper;
import io.appium.uiautomator.core.UiAutomatorBridge;
import org.w3c.dom.Document;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.HashMap;

/**
 * Created by jonahss on 8/12/14.
 */
public abstract class XMLHierarchy {

  public static ArrayList<ClassInstancePair> getClassInstancePairs(String xpathExpression)
          throws ElementNotFoundException, InvalidSelectorException, ParserConfigurationException {
    XPath xpath = XPathFactory.newInstance().newXPath();
    XPathExpression exp = null;
    try {
      exp = xpath.compile(xpathExpression);
    } catch (XPathExpressionException e) {
      throw new InvalidSelectorException(e.getMessage());
    }

    Node formattedXmlRoot;

    formattedXmlRoot = getFormattedXMLDoc();

    return getClassInstancePairs(exp, formattedXmlRoot);
  }

  public static ArrayList<ClassInstancePair> getClassInstancePairs(XPathExpression xpathExpression, Node root) throws ElementNotFoundException {

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
        try {
          pairs.add(getPairFromNode(nodes.item(i)));
        } catch (PairCreationException e) { }
      }
    }

    return pairs;
  }

  public static InputSource getRawXMLHierarchy() {
    AccessibilityNodeInfo root = getRootAccessibilityNode();
    return serializeAccessibilityNode(root);
  }

  private static AccessibilityNodeInfo getRootAccessibilityNode() {
    while(true){
      AccessibilityNodeInfo root = UiAutomatorBridge.getInstance().getQueryController().getAccessibilityRootNode();
      if (root != null) {
        return root;
      }
    }
  }

  private static InputSource serializeAccessibilityNode(AccessibilityNodeInfo root) {
    try {

      final File dumpFolder = new File(Environment.getDataDirectory(), "local/tmp");
      final File dumpFile = new File(dumpFolder, "dump.xml");

      dumpFolder.mkdirs();
      dumpFile.delete();

      AccessibilityNodeInfoDumper.dumpWindowToFile(root, dumpFile);

      return new InputSource(new FileReader(dumpFile));
    } catch (Exception e) {
      throw new RuntimeException("Failed to Dump Window Hierarchy", e);
    }
  }

  public static Node getFormattedXMLDoc() {
    return formatXMLInput(getRawXMLHierarchy());
  }

  public static Node formatXMLInput(InputSource input) {
    XPath xpath = XPathFactory.newInstance().newXPath();

    Node root = null;
    try {
      root = (Node) xpath.evaluate("/", input, XPathConstants.NODE);
    } catch (XPathExpressionException e) {
      throw new RuntimeException("Could not read xml hierarchy: " + e.getMessage());
    }

    HashMap<String, Integer> instances = new HashMap<String, Integer>();

    // rename all the nodes with their "class" attribute
    // add an instance attribute
    annotateNodes(root, instances);

    return root;
  }

  private static ClassInstancePair getPairFromNode(Node node) throws PairCreationException {

    NamedNodeMap attrElements = node.getAttributes();
    String androidClass;
    String instance;

    try {
      androidClass = attrElements.getNamedItem("class").getNodeValue();
      instance = attrElements.getNamedItem("instance").getNodeValue();
    } catch (Exception e) {
      throw new PairCreationException("Could not create ClassInstancePair object: " + e.getMessage());
    }

    return new ClassInstancePair(androidClass, instance);
  }

  private static void annotateNodes(Node node, HashMap<String, Integer> instances) {
    NodeList children = node.getChildNodes();
    for (int i = 0; i < children.getLength(); i++) {
      if (children.item(i).getNodeType() == Node.ELEMENT_NODE) {
        visitNode(children.item(i), instances);
        annotateNodes(children.item(i), instances);
      }
    }
  }

  // set the node's tag name to the same as it's android class.
  // also number all instances of each class with an "instance" number. It increments for each class separately.
  // this allows use to use class and instance to identify a node.
  // we also take this chance to clean class names that might have dollar signs in them (and other odd characters)
  private static void visitNode(Node node, HashMap<String, Integer> instances) {

    Document doc = node.getOwnerDocument();
    NamedNodeMap attributes = node.getAttributes();

    String androidClass;
    try {
      androidClass = attributes.getNamedItem("class").getNodeValue();
    } catch (Exception e) {
      return;
    }

    androidClass = cleanTagName(androidClass);

    if (!instances.containsKey(androidClass)) {
      instances.put(androidClass, 0);
    }
    Integer instance = instances.get(androidClass);

    Node attrNode = doc.createAttribute("instance");
    attrNode.setNodeValue(instance.toString());
    attributes.setNamedItem(attrNode);

    doc.renameNode(node, node.getNamespaceURI(), androidClass);

    instances.put(androidClass, instance + 1);
  }

  private static String cleanTagName(String name) {
    name = name.replaceAll("[$@#&]", ".");
    return name.replaceAll("\\s", "");
  }
}
