import type {Constraints, StringRecord, W3CCapabilities} from '@appium/types';

/** Plain capabilities object (key-value). */
export type CapsRecord = StringRecord<unknown>;

/**
 * W3C-style caps container with optional firstMatch and alwaysMatch.
 * Based on {@linkcode W3CCapabilities}.
 */
export type W3CCapsLike = Partial<W3CCapabilities<Constraints>> & StringRecord<unknown>;
