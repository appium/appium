package io.appium.android.bootstrap.utils;

import android.os.Environment;
import com.android.uiautomator.core.UiDevice;
import io.appium.android.bootstrap.exceptions.ElementNotFoundException;
import io.appium.android.bootstrap.exceptions.InvalidSelectorException;
import io.appium.android.bootstrap.exceptions.PairCreationException;
import org.w3c.dom.Document;
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

  public static ArrayList<ClassInstancePair> getClassInstancePairs(String xpathExpression) throws ElementNotFoundException, InvalidSelectorException, ParserConfigurationException {
    XPath xpath = XPathFactory.newInstance().newXPath();
    XPathExpression exp = null;
    try {
      exp = xpath.compile(xpathExpression);
    } catch (XPathExpressionException e) {
      throw new InvalidSelectorException(e.getMessage());
    }

    Node formattedXmlRoot;

    try {
      formattedXmlRoot = getFormattedXMLDoc();
    } catch (XPathExpressionException e) {
      throw new InvalidSelectorException(e.getMessage());
    }

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
        } catch (PairCreationException e) {
          continue;
        }
      }
    }

    return pairs;
  }

  public static InputSource getRawXMLHierarchy() throws ElementNotFoundException {
    // Note that
    // "new File(new File(Environment.getDataDirectory(), "local/tmp"), fileName)"
    // is directly from the UiDevice.java source code.
    final File dumpFolder = new File(Environment.getDataDirectory(), "local/tmp");
    final String dumpFileName = "dump.xml";
    final File dumpFile = new File(dumpFolder, dumpFileName);

    dumpFolder.mkdirs();

    dumpFile.delete();

    //compression off by default TODO add this as a config option
    NotImportantViews.discard(false);

    try {
      // dumpWindowHierarchy often has a NullPointerException
      UiDevice.getInstance().dumpWindowHierarchy(dumpFileName);
    } catch (Exception e) {
      e.printStackTrace();
      // If there's an error then the dumpfile may exist and be empty.
      dumpFile.delete();
    }

    try {
      return new InputSource(new FileReader(dumpFile));
    } catch (FileNotFoundException e) {
      e.printStackTrace();
      throw new ElementNotFoundException("Failed to Dump Window Hierarchy");
    }
  }

  public static Node getFormattedXMLDoc() throws ElementNotFoundException, XPathExpressionException, ParserConfigurationException {
    return formatXMLInput(getRawXMLHierarchy());
  }

  public static Node formatXMLInput(InputSource input) throws XPathExpressionException {
    XPath xpath = XPathFactory.newInstance().newXPath();

    Node root = (Node) xpath.evaluate("/", input, XPathConstants.NODE);

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

  private static void annotateNodes(Node node, HashMap<String, Integer>instances) {
    NodeList children = node.getChildNodes();
    for (int i = 0; i < children.getLength(); i++) {
      if (children.item(i).getNodeType() == Node.ELEMENT_NODE) {
        visitNode(children.item(i), instances);
        annotateNodes(children.item(i), instances);
      }
    }
  }

  private static void visitNode(Node node, HashMap<String, Integer> instances) {

    Document doc = node.getOwnerDocument();
    NamedNodeMap attributes = node.getAttributes();

    String androidClass;
    try {
      androidClass = attributes.getNamedItem("class").getNodeValue();
    } catch (Exception e) {
      return;
    }

    if (!instances.containsKey(androidClass)) {
      instances.put(androidClass, 0);
    }
    Integer instance = instances.get(androidClass);

    Node attrNode = doc.createAttribute("instance");
    attrNode.setNodeValue(instance.toString());
    attributes.setNamedItem(attrNode);

    doc.renameNode(node, node.getNamespaceURI(), androidClass);

    instances.put(androidClass, instance+1);
  }
}
