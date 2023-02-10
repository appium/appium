/**
 * Declares new "kinds" within TypeDoc.
 *
 * A "kind" is a way for TypeDoc to understand how to document something.  Mostly, these have a 1:1 relationship with some sort of TypeScript concept.  This is unsuitable for our purposes, since there's no notion of a "command" or "execute method" in TypeScript.  To that end, we must create new ones.
 *
 * Note that _creating new `ReflectionKind`s is a hack_ and is not supported by TypeDoc. This is the reason you will see `as any` wherever a {@linkcode AppiumPluginReflectionKind} is used.
 *
 * @module
 */

/**
 * Adapted from `@knodes/typedoc-pluginutils`
 * @see https://github.com/knodescommunity/typedoc-plugins
 * Copyright (c) 2022 KnodesCommunity
 * Licensed MIT
 * @see https://github.com/KnodesCommunity/typedoc-plugins/blob/05717565fae14357b1c4be8122f3156e1d46d332/LICENSE
 * @module
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

function addReflectionKind(name: string, value?: number | null) {
  const kindAny = ReflectionKind as any;
  const existingValue = kindAny[name];
  if (existingValue !== null && existingValue !== undefined) {
    return existingValue;
  }
  const defaultedValue = value ?? getHigherBitMask() * 2;
  kindAny[name] = defaultedValue;
  kindAny[defaultedValue] = name;
  return defaultedValue;
}

/**
 * Extends the TypeDoc's `ReflectionKind` to add namespaced kinds
 */
export enum AppiumPluginReflectionKind {
  Driver = addReflectionKind('Driver'),
  Plugin = addReflectionKind('Plugin'),
  Command = addReflectionKind('Command'),
  ExecuteMethod = addReflectionKind('ExecuteMethod'),
  Extension = addReflectionKind('Extension', Driver | Plugin),
  Any = addReflectionKind('Any', Command | ExecuteMethod | Driver | Plugin),
}
