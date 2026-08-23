import type {Element} from '@xmldom/xmldom';
import {DOMParser, MIME_TYPE} from '@xmldom/xmldom';
import {select as xpathQuery} from 'xpath';

/**
 * Runs an XPath query against an XML string.
 * @param query XPath query.
 * @param xmlStr XML source.
 */
export function runQuery(query: string, xmlStr: string): Element[] {
  const dom = new DOMParser().parseFromString(xmlStr, MIME_TYPE.XML_TEXT);
  // @ts-expect-error Missing Node properties are not needed.
  // https://github.com/xmldom/xmldom/issues/724
  const nodes = xpathQuery(query, dom);
  // the xpath typings describe lib.dom nodes rather than xmldom ones, so this is the one place
  // where the two type worlds have to be bridged
  return nodes as unknown as Element[];
}

/**
 * Transforms an XPath query to work with the original platform-specific XML
 *
 * @param query - The XPath query to transform
 * @param xmlStr - The transformed XML string
 * @param multiple - Whether to return multiple matches
 * @returns The transformed query string or null if no matches found
 */
export function transformQuery(query: string, xmlStr: string, multiple: boolean): string | null {
  const nodes = runQuery(query, xmlStr);
  if (!Array.isArray(nodes)) {
    return null;
  }

  const newQueries = nodes
    // nodes with no indexPath cannot be located on the device, so skip them deliberately.
    // the only such node is the ios AppiumAUT root (see transformSourceXml)
    .filter((node) => node.hasAttribute('indexPath'))
    .map((node) => {
      const indexPath = getNodeAttrVal(node, 'indexPath');
      // at this point indexPath will look like /0/0/1/1/0/1/0/2
      const newQuery = indexPath
        .substring(1) // remove leading / so we can split
        .split('/') // split into indexes
        .map((indexStr) => {
          // map to xpath node indexes (1-based)
          const xpathIndex = parseInt(indexStr, 10) + 1;
          return `*[${xpathIndex}]`;
        })
        .join('/'); // reapply /

      // now to make this a valid xpath from the root, prepend the / we removed earlier
      return `/${newQuery}`;
    });

  if (newQueries.length === 0) {
    return null;
  }
  return multiple ? newQueries.join(' | ') : newQueries[0];
}

/**
 * Gets the value of a node attribute
 *
 * @param node - The XML node
 * @param attr - The attribute name
 * @returns The attribute value
 * @throws {Error} If the attribute doesn't exist
 */
export function getNodeAttrVal(node: Element, attr: string): string {
  const value = node.getAttribute(attr);
  if (value === null) {
    throw new Error(`Tried to retrieve a node attribute '${attr}' but the node didn't have it`);
  }
  return value;
}
