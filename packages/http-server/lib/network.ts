import os, {type NetworkInterfaceInfo} from 'node:os';

import {log} from './logger.js';

export const V4_BROADCAST_IP = '0.0.0.0';
export const V6_BROADCAST_IP = '::';

/**
 * Returns network interfaces for the given IP family.
 *
 * @param family - 4 for IPv4, 6 for IPv6, or null for all.
 */
export function fetchInterfaces(family: 4 | 6 | null = null): os.NetworkInterfaceInfo[] {
  let familyValue: (4 | 6 | string)[] | null = null;
  if (family === 4) {
    familyValue = [4, 'IPv4'];
  } else if (family === 6) {
    familyValue = [6, 'IPv6'];
  }
  const ifaces = Object.values(os.networkInterfaces()).filter(Boolean) as os.NetworkInterfaceInfo[][];
  return ifaces.flat().filter((info) => !familyValue || familyValue.includes(info.family as 4 | 6 | string));
}

/**
 * Returns true if the address is a broadcast IP (0.0.0.0 or ::).
 */
export function isBroadcastIp(address: string): boolean {
  return [V4_BROADCAST_IP, V6_BROADCAST_IP, `[${V6_BROADCAST_IP}]`].includes(address);
}

/**
 * Logs the REST listener URL; if the bind address is a broadcast address, lists concrete interface URLs.
 */
export function logServerAddress(url: string): void {
  const urlObj = new URL(url);
  log.info(`Appium REST http interface listener started on ${url}`);
  if (!isBroadcastIp(urlObj.hostname)) {
    return;
  }

  const interfaces = fetchInterfaces(urlObj.hostname === V4_BROADCAST_IP ? 4 : 6);
  const toLabel = (iface: NetworkInterfaceInfo) => {
    const href = urlObj.href.replace(urlObj.hostname, iface.address);
    return iface.internal ? `${href} (only accessible from the same host)` : href;
  };
  log.info(
    `You can provide the following ${interfaces.length === 1 ? 'URL' : 'URLs'} ` +
      `in your client code to connect to this server:\n` +
      interfaces.map((iface) => `\t${toLabel(iface)}`).join('\n'),
  );
}
