export class OpenCvAutoreleasePool {
  /**
   * @type {Set}
   */
  _items;

  constructor() {
    this._items = new Set();
  }

  /**
   * @template T
   * @param {...T} items
   * @return {T[]|T} the same items
   */
  add(...items) {
    for (const item of items) {
      this._items.add(item);
    }
    return items.length === 1 ? items[0] : items;
  }

  drain() {
    for (const item of this._items) {
      try {
        item.delete();
      } catch {}
    }
    this._items.clear();
  }
}
