# @appium/strongbox

> Persistent storage for Appium extensions

## Summary

This package is intended to be used in [Appium](https://appium.io) extensions which need to persist data between Appium runs.  An example of such data may be a device token or key.  

`@appium/strongbox` provides a simple and extensible API for managing such data, while abstracting the underlying storage mechanism.

_Note:_ This module is not intended for storing sensitive data.

## Usage

First, create an instance of `Strongbox`:

```ts
import {strongbox} from '@appium/strongbox';

const box = strongbox('my-pkg');
```

This instance corresponds to a unique collection of data.

From here, create a placeholder for data (you will need to provide the type of data you intend to store):

```ts
const item = await box.createItem<string>('my unique name');
```

...or, if you already have the data on-hand:

```ts
const item: Buffer|string = getSomeData();

const item = await box.createItemWithContents('my unique name', data);
```

Either way, you can read its contents:

```ts
// if the item doesn't exist, this result will be undefined
const contents = await item.read();
```

Or write new data to the item:

```ts
await item.write('new stuff');
```

The last-read contents of the `Item` will be available on the `contents` property, but the value of this property is only current as of the last `read()`:

```ts
const {contents} = item;
```

## API

In lieu of actual documentation, look at the type definitions that this package ships.

## Customization

1. Create a class that implements the `Item` interface:

    ```ts
    import {strongbox, Item} from '@appium/strongbox';
    import {Foo, getFoo} from 'somewhere/else';

    class FooItem implements Item<Foo> {
      // ...
    }
    ```

2. Provide this class as the `defaultCtor` option to `strongbox()`:

    ```ts
    const box = strongbox('my-pkg', {defaultCtor: FooItem});
    ```

3. Use like you would any other `Strongbox` instance:

    ```ts
    const foo: Foo = getFoo();
    const item = await box.createItemWithValue('my unique name', Foo);
    ```

## Default Behavior, For the Curious

Out-of-the-box, a `Strongbox` instance corresponds to a directory on-disk, and each `Item` (returned by `createItem()/createItemWithContents()`) corresponds to a file within that directory.  

The directory of the `Strongbox` instance is determined by the [env-paths](https://www.npmjs.com/package/env-paths) package, and is platform-specific.

## License

Copyright © 2023 OpenJS Foundation. Licensed Apache-2.0
