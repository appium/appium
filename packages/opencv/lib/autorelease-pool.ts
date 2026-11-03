interface Deletable {
  delete(): void;
}

export class OpenCvAutoreleasePool {
  private readonly _items: Set<Deletable>;

  constructor() {
    this._items = new Set();
  }

  add<T extends Deletable>(item: T): T;
  add<T extends Deletable>(...items: T[]): T | T[] {
    for (const item of items) {
      this._items.add(item);
    }
    return items.length === 1 ? items[0] : items;
  }

  drain(): void {
    for (const item of this._items) {
      try {
        item.delete();
      } catch {
        // Ignore errors during cleanup
      }
    }
    this._items.clear();
  }
}
