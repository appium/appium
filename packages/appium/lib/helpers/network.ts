import _ from 'lodash';
import os from 'node:os';

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
  const ifaces = _.values(os.networkInterfaces()).filter(Boolean) as os.NetworkInterfaceInfo[][];
  return _.flatMap(ifaces).filter(
    (info) => !familyValue || familyValue.includes(info.family as 4 | 6 | string)
  );
}

/**
 * Returns true if the address is a broadcast IP (0.0.0.0 or ::).
 */
export function isBroadcastIp(address: string): boolean {
  return [V4_BROADCAST_IP, V6_BROADCAST_IP, `[${V6_BROADCAST_IP}]`].includes(address);
}
