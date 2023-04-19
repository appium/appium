import {mkdir, readFile, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {Item, ItemEncoding, Strongbox, Value} from '.';
import {slugify} from './util';

/**
 * Base item implementation
 *
 * @remarks This class is not intended to be instantiated directly
 * @typeParam T - Type of data stored in the `Item`
 */
export class BaseItem<T extends Value, U extends Strongbox = Strongbox> implements Item<T> {
  /**
   * {@inheritdoc Item.value}
   */
  protected _value?: T | undefined;

  /**
   * Parent Strongbox instance
   */
  public readonly container: string;
  /**
   * Unique slugified identifier
   */
  public readonly id: string;
  /**
   * {@inheritdoc Item.value}
   */
  public readonly value: T | undefined;

  /**
   * Slugifies the name
   * @param name Name of instance
   * @param parent Parent Strongbox
   * @param encoding Defaults to `utf8`
   */
  constructor(
    public readonly name: string,
    parent: U,
    public readonly encoding: ItemEncoding = 'utf8'
  ) {
    this.container = parent.container;
    this.id = path.join(this.container, slugify(name));
    Object.defineProperties(this, {
      value: {
        get() {
          return this._value;
        },
        enumerable: true,
      },
      _value: {
        enumerable: false,
        writable: true,
      },
    });
  }

  /**
   * {@inheritdoc Item.clear}
   */
  public async clear(): Promise<void> {
    try {
      await unlink(this.id);
      this._value = undefined;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
    }
  }

  /**
   * {@inheritdoc Item.read}
   */
  public async read(): Promise<T | undefined> {
    try {
      this._value = (await readFile(this.id, {
        encoding: this.encoding,
      })) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
    }
    return this._value;
  }

  /**
   * {@inheritdoc Item.write}
   */
  public async write(value: T): Promise<void> {
    if (this._value !== value) {
      await mkdir(path.dirname(this.id), {recursive: true});
      await writeFile(this.id, value, this.encoding);
      this._value = value;
    }
  }
}
