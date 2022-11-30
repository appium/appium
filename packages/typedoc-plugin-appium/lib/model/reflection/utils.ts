/**
 * Adapted from `@knodes/typedoc-pluginutils`
 * @see https://github.com/knodescommunity/typedoc-plugins
 * Copyright (c) 2022 KnodesCommunity
 * Licensed MIT
 * @see https://github.com/KnodesCommunity/typedoc-plugins/blob/05717565fae14357b1c4be8122f3156e1d46d332/LICENSE
 */

import {ReflectionKind} from 'typedoc';

const getHigherBitMask = () =>
  Math.max(
    ...Object.values({...ReflectionKind, All: -1})
      .filter((value) => typeof value === 'number')
      .map((v) => v.toString(2))
      .filter((v) => v.match(/^0*10*$/))
      .map((v) => parseInt(v, 2))
  );
export const addReflectionKind = (ns: string, name: string, value?: number | null) => {
  const fullName = `${ns}:${name}`;

  const kindAny = ReflectionKind as any;
  const existingValue = kindAny[fullName];
  if (existingValue !== null && existingValue !== undefined) {
    return existingValue;
  }
  const defaultedValue = value ?? getHigherBitMask() * 2;
  kindAny[fullName] = defaultedValue;
  kindAny[defaultedValue] = fullName;
  return defaultedValue;
};
