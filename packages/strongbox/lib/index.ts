import envPaths from 'env-paths';
import path from 'node:path';
import {BaseItem} from './base-item';
import {slugify, slugifyPath} from './util';

/**
 * Valid file encodings.
 *
 * `null` means the file should be read and written as a `Buffer`.
 */
export type ItemEncoding = BufferEncoding | null;

/**
 * Valid value wrapped by {@linkcode Item}. Can be an encoded string or `Buffer`
 */
export type Value = string | Buffer;

/**
 * An object representing a persisted item containing something of type `T` (which can be a {@linkcode Buffer} or an encoded string; see {@linkcode ItemEncoding}).
 *
 * A {@linkcode Item} does not know anything about where it is stored, or how it is stored.
 * @typeParam T - Type of data stored in the item
 */
export interface Item<T extends Value> {
  /**
   * Encoding of underlying value
   */
  encoding: ItemEncoding;
  /**
   * Slugified name
   */
  id: string;
  /**
   * Name of item
   */
  name: string;

  /**
   * Reads value
   */
  read(): Promise<T | undefined>;
  /**
   * Writes value
   * @param value New value
   */
  write(value: T): Promise<void>;

  /**
   * Deletes the item.
   */
  clear(): Promise<void>;

  /**
   * Last known value (stored in memory)
   *
   * @remarks A custom {@linkcode Item} meant to handle very large files should probably not implement this.
   */
  value?: T | undefined;
}

/**
 * Set of known `Item` encodings
 * @internal
 */
const ITEM_ENCODINGS: Readonly<Set<ItemEncoding>> = new Set([
  'ascii',
  'utf8',
  'utf-8',
  'utf16le',
  'ucs2',
  'ucs-2',
  'base64',
  'base64url',
  'latin1',
  'binary',
  'hex',
  null,
]);

/**
 * Type guard for encodings
 * @param value any
 * @returns `true` is `value` is a valid file encoding
 */
function isEncoding(value: any): value is ItemEncoding {
  return ITEM_ENCODINGS.has(value);
}

/**
 * @see {@linkcode StrongboxOpts}
 */
export const DEFAULT_SUFFIX = 'strongbox';

/**
 * A constructor function which instantiates a {@linkcode Item}.
 */
export type ItemCtor<T extends Value> = new (
  name: string,
  container: string,
  encoding?: ItemEncoding
) => Item<T>;

/**
 * Main entry point for use of this module
 *
 * Manages multiple {@linkcode Item}s.
 */
export class Strongbox {
  /**
   * Default {@linkcode ItemCtor} to use when creating new {@linkcode Item}s
   */
  protected defaultItemCtor: ItemCtor<any>;
  /**
   * Slugified name of this instance; corresponds to the directory name.
   *
   * If `dir` is provided, this value is unused.
   * If `suffix` is provided, then this will be the parent directory of `suffix`.
   */
  public readonly id: string;

  /**
   * Override the directory of this container.
   *
   * If this is present, both `suffix` and `containerId` are unused.
   */
  public readonly container: string;

  /**
   * Store of known {@linkcode Item}s
   * @internal
   */
  protected items: Map<string, WeakRef<Item<any>>>;

  /**
   * Slugifies the name & determines the directory
   * @param name Name of instance
   * @param opts Options
   */
  protected constructor(
    public readonly name: string,
    {
      container,
      suffix = DEFAULT_SUFFIX,
      defaultItemCtor: defaultCtor = BaseItem,
    }: StrongboxOpts = {}
  ) {
    this.id = slugify(name);
    this.defaultItemCtor = defaultCtor;
    this.items = new Map();
    this.container = container
      ? slugifyPath(container)
      : path.join(envPaths(this.id).data, slugify(suffix));
  }

  /**
   * Creates a new {@linkcode Strongbox}
   * @param name Name of instance
   * @param opts Options
   * @returns New instance
   */
  public static create(name: string, opts?: StrongboxOpts) {
    return new Strongbox(name, opts);
  }

  /**
   * Create a new {@linkcode Item}.
   *
   * Reads the item, if it is already persisted. Does not throw if missing.
   * @param name Unique name of item
   * @param encoding Encoding of item; defaults to `utf8`
   * @returns New `Item`
   * @typeParam T - Type of data stored in the `Item`
   */
  async createItem<T extends Value>(
    name: string,
    ctor?: ItemCtor<T>,
    encoding?: ItemEncoding
  ): Promise<Item<T>>;
  async createItem<T extends Value>(name: string, encoding?: ItemEncoding): Promise<Item<T>>;
  async createItem<T extends Value>(
    name: string,
    encodingOrCtor?: ItemEncoding | ItemCtor<T>,
    encoding?: ItemEncoding
  ): Promise<Item<T>> {
    if (isEncoding(encodingOrCtor)) {
      encoding = encodingOrCtor;
      encodingOrCtor = this.defaultItemCtor;
    }
    const item = new (encodingOrCtor ?? (this.defaultItemCtor as ItemCtor<T>))(
      name,
      this.container,
      encoding
    );
    if (this.items.has(item.id)) {
      throw new ReferenceError(`Item with id "${item.id}" already exists`);
    }
    try {
      await item.read();
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
    }
    this.items.set(item.id, new WeakRef(item));
    return item;
  }

  /**
   * Creates a {@linkcode Item} then immediately writes value to it.
   *
   * If it exists already, it will be overwritten.
   * @param name Name of `Item`
   * @param value File value to write
   * @param ctor Specific {@linkcode ItemCtor} to use
   * @param encoding File encoding
   * @returns New `Item` w/ value of `value`
   */
  async createItemWithValue<T extends Value>(
    name: string,
    value: T,
    ctor: ItemCtor<T>,
    encoding?: ItemEncoding
  ): Promise<Item<T>>;
  async createItemWithValue<T extends Value>(
    name: string,
    value: T,
    encoding?: ItemEncoding
  ): Promise<Item<T>>;
  async createItemWithValue<T extends Value>(
    name: string,
    value: T,
    encodingOrCtor?: ItemEncoding | ItemCtor<T>,
    encoding?: ItemEncoding
  ): Promise<Item<T>> {
    const item = isEncoding(encodingOrCtor)
      ? await this.createItem<T>(name, encodingOrCtor)
      : await this.createItem<T>(name, encodingOrCtor, encoding);
    await item.write(value);
    return item;
  }

  /**
   * Attempts to retrieve an {@linkcode Item} by its `id`.
   * @param id ID of item
   * @returns An `Item`, if found
   */
  public getItem(id: string): Item<any> | undefined {
    const ref = this.items.get(id);
    return ref?.deref();
  }

  /**
   * Clears _all_ items, as well as the container.
   */
  public async clearAll(): Promise<void> {
    const items = [...this.items.values()].map((ref) => ref.deref()).filter(Boolean) as Item<any>[];
    await Promise.all(items.map((item) => item.clear()));
  }
}

/**
 * Options for {@linkcode strongbox}
 */
export interface StrongboxOpts {
  /**
   * Default {@linkcode Item} constructor.
   *
   * Unless a constructor is specified when calling {@linkcode Strongbox.createItem} or {@linkcode Strongbox.createItemWithValue}, this will be used.
   * @defaultValue BaseItem
   */
  defaultItemCtor?: ItemCtor<any>;
  /**
   * Override default container, which is chosen according to environment
   */
  container?: string;
  /**
   * Extra subdir to append to the auto-generated file directory hierarchy.
   *
   * This is ignored if `container` is provided.
   * @defaultValue 'strongbox'
   */
  suffix?: string;
}

/**
 * {@inheritdoc Strongbox.create}
 */
export const strongbox = Strongbox.create;

/**
 * This can be subclassed if needed.
 */
export {BaseItem};
