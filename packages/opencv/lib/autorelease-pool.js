import _ from 'lodash';

export class OpenCvAutoreleasePool {
  /**
   * @type {Set}
   */
  _items;

  OpenCvAutoreleasePool() {
    this._items = new Set();
  }

  /**
   * @template T
   * @param {...T} _items
   * @return {T[]} the same items
   */
  add(...items) {
    for (const item of items) {
      if (_.has(item, 'delete') && _.isFunction(item.delete)) {
        this._items.add(item);
      }
    }
    return items;
  }

  drain() {
    for (const item of this._items) {
      try {
        item.delete();
      } catch (ign) {}
    }
    this._items = [];
  }
}