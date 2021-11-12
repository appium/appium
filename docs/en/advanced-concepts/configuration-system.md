# Appium 2 Configuration System

Appium 2 supports configuration files. A configuration file is intended to have (nearly) 1:1 parity with command-line arguments. An end user can supply Appium 2 with a configuration file, CLI args, or both (the args have precedence over the config file).

This document will be a technical overview of how the configuration system works. It is intended for Appium contributors, but will also explain the system's fundamental features.

## Reading a Config File

A config file is a JSON, JavaScript, or YAML file which can be validated against a schema. By default, this file will be named `.appiumrc.{json,js,yaml,yml}` and should be in the root of the project which depends upon `appium`. Other filenames and locations are supported via the `--config <file>` flag. For obvious reasons, the `config` argument is disallowed within config files.

In lieu of a separate file, configuration can be embedded in a project's `package.json` using the `appiumConfig` property, e.g.,:

```json
{
  "appiumConfig": {
    "server": {
      "port": 12345
    }
  }
}
```

When an Appium server is started via the `appium` executable, the `init` function in `lib/main.js` will call into `lib/config-file.js` to load and/or search for a configuration file and in `package.json`.

> Note: It is not an error if configuration isn't found!

The [`lilconfig`](https://npm.im/lilconfig) package provides the search & load functionality; refer to its documentation for more information about the search paths. Additionally, Appium provides support for config files written in YAML via the package [`yaml`](https://npm.im/yaml).

If a config file is found and successfully [validated](#validation), the result will be merged with a set of defaults and any additionall CLI arguments. CLI arguments have precedence over config files, and config files have precedence over defaults.

## Validation

The same system is used for _both_ validation of config files _and_ command-line arguments.

The package [`ajv`](https://npm.im/ajv) provides validation. Of course, to make `ajv` validate anything, it must be provided a _schema_.

The _base_ schema is a [JSON Schema Draft-7](https://json-schema.org/draft/2020-12/json-schema-core.html)-compliant object exported by `lib/schema/appium-config-schema.js`. This schema defines configuration _native to Appium_, and only concerns its behavior as a _server_; it does not define configuration for any other functionality (e.g., the `plugin` or `driver` subcommands).

> Note that this file is the _base_ schema; this will become painfully relevant.

This file is is _not_ a JSON file, because a) JSON is painful to work with for humans, b) is especially reviled by @jlipps, and c) `ajv` accepts objects, not JSON files.

It is more straightforward to explain how config files are validated, so we'll start there.

### Validating Config Files

When a config file is found (`lib/config-file.js`), it will call the `validate` function exported from `lib/schema/schema.js` with the contents of the config file. In turn, this asks `ajv` to validate the data against the schema that Appium has provided it.

If the config file is invalid, errors will be generated to be displayed to the user. Finally, the `init` function will detect these errors, display them, and the process will exit.

I hope that made sense, because this is the easy part.

### Validating CLI Arguments

As mentioned earlier, the same system is used for validating both config files and CLI arguments.

Totally not judging, but Appium uses [`argparse`](https://npm.im/argparse) for its CLI argument parsing. This package, and others like it, provides an API to define the arguments a command-line Node.js script accepts, and will ultimately return an object representation of the user-supplied arguments.

Just as the schema defines what's allowed in a config file, it also defines what's allowed on the command-line.

#### Defining CLI Arguments via Schema

CLI arguments must be _defined_ before their values can be validated.

A JSON schema isn't a natural fit for defining CLI args--it needs some grease to make it work--but it's close enough that we can do so with an adapter and some custom metadata.

In `lib/cli/parser.js`, there's a wrapper around `argparse`'s `ArgumentParser`; it's called (wait for it)... `ArgParser`. The wrapper exists because we're doing some custom things with `argparse`, but is has nothing to do with the schema directly.

An `ArgParser` instance is created and its `parseArgs()` method is called with the raw CLI arguments. The definition of the accepted arguments comes from `lib/cli/args.js` in part--here, all of the arguments _not_ intended for use with the `server` subcommand are hard-coded (e.g., the `driver` subcommand and _its_ subcommands). `args.js` also contains a function `getServerArgs()`, which in turn calls into `toParserArgs` in `lib/schema/cli-args.js`. `lib/schema/cli-args.js` can be considered the "adapter" layer between `argparse` and the schema.

`toParserArgs` uses the `flattenSchema` function exported by `lib/schema/schema.js`, which "squashes" the schema into a key/value representation. Then, `toParserArgs` iterates over each key/value pair and "converts" it into a suitable `ArgumentOption` object for final handoff to `ArgParser`.

This adapter (`cli-args.js`) is where most of the mess is hidden; let's explore this rat's nest a bit further.

##### CLI & Schema Incongruities

The conversion algorithm (see function `subSchemaToArgDef` in `lib/schema/cli-args.js`) is mostly just hacks and special cases neatly packed into a function. Things that don't cleanly map from `argparse` to a JSON schema include, but are not limited to:

- A schema cannot natively express "store the value of `--foo=<value>` in a property called `bar`" in a schema (this corresponds to the `ArgumentOption['dest']` prop).
- A schema cannot natively express aliases; e.g., `--verbose` can also be `-v`
- A schema `enum` is not restricted to multiple types, but `argparse`'s equivalent `ArgumentOption['choices']` prop _is_
- A schema does not know about `argparse`'s concept of "actions" (note that Appium is not currently using custom actions--though it did, and it could again).
- `argparse` has no native type for `email`, `hostname`, `ipv4`, `uri` etc., and the schema does
- Schema validation only _validates_, it does not perform translation, transformation, or coercion (mostly). `argparse` allows this.
- Schemas allow the `null` type, for whatever reason. Ever pass `null` on the CLI?
- `argparse` does not understand anything other than primitives; no objects, arrays, etc., and certainly not arrays of a particular type.

All of the above cases and others are handled by the adapter.

> Note: some decisions made in the adapter were arrived at via coin toss. If you are curious about why something is the way it is, it's likely that it had to do _something_.

Let's look more closely at handling types.

#### Argument Types via `ajv`

While `argparse` allows consumers, via its API, to define the _type_ of various arguments (e.g., a string, number, boolean flag, etc.), Appium mostly avoids these built-in types. _Why is that?_ Well:

1. We already know the type of an argument, because we've defined it in a schema.
2. `ajv` provides validation against a schema.
3. A schema allows for greater expression of types, allowed values, etc., than `argparse` can provide natively.
4. The expressiveness of a schema allows for better error messaging.

To that end, the adapter eschews `argparse`'s built-in types (see allowed string values of `ArgumentOption['type']`) and instead abuses the ability to provide a _function_ as a `type`. The exception is _boolean_ flags, which do not have a `type`, but rather `action: 'store_true'`. The world may never know why.

##### Types as Functions

When a `type` is a function, the function performs both validation _and_ coercion (if necessary). So what are these functions?

> Note: `type` is _omitted_ (and thus _not_ a function) from the `ArgumentOption` if the property type is `boolean`, and is instead provided an `action` property of `store_true`. Yes, this is weird. No, I don't know why.

Well... it depends upon the schema. But generally speaking, we create a _pipeline_ of functions, each corresponding to a keyword in the schema. Let's take the example of the `port` argument. In lieu of asking the OS which ports the `appium`-running user can bind to, this argument is expected to be an integer between 1 and 65535. This turns out to be two functions which we combine into a pipeline:

1. Convert the value to an integer, if possible. Because _every value in `process.argv` is a string_, we must coerce if we want a number.
2. Use `ajv` to validate the integer against the schema for `port`. A schema lets us define a range via the `minimum` and `maximum` keywords. Read more about how this works in

Much like the config file validation, if errors are detected, Appium nicely tells the end-user and the process exits w/ some help text.

For other arguments which are naturally of non-primitive types, things are not so straightforward.

##### Transformers

Remember how `argparse` doesn't understand arrays? What if the most ergonomic way to express a value is, in fact, an array?

Well, Appium can't accept an array on the CLI, even though it can accept one in the config file. But Appium _can_ accept a comma-delimited string (a CSV "line"). Or a string filepath referring to a file which _contains_ a delimited list. Either way: by the time the value gets out of the argument parser, it should be an array.

And as mentioned above, the native facilities of a JSON schema cannot express this. However, it's possible to define a _custom keyword_ which Appium can then detect and handle accordingly. So that's what Appium does.

In this case, a custom keyword `appiumCliTransformer` is registered with `ajv`. The value of `appiumCliTransformer` (at the time of this writing) can be `csv` or `json`. In the base schema file, `appium-config-schema.js`, Appium uses `appiumCliTransformer: 'csv'` if this behavior is desired.

> Note: Any property defined in the schema having type `array` will _automatically_ uses the `csv` transformer. Likewise, a property having type `object` will use the `json` transformer. It's conceivable that `array` may want to use the `json` transformer, but otherwise, the presence of the `appiumCliTransformer` keyword on an `array`-or-`object`-typed property is not stricly necessary.

The adapter (remember the adapter?) creates a pipeline function including a special "CSV transformer" (transformers are defined in `lib/schema/cli-transformers.js`), and uses this function as the `type` property of the `ArgumentOption` passed into `argparse`. In this case, the `type: 'array'` in the schema is ignored.

> Note: the config file doesn't _need_ to perform any complex transformation of values, because it naturally allows Appium to define exactly what it expects. So Appium does no post-processing of config file values.

Properties that do not need this special treatment use `ajv` directly for validation. How this works requires some explanation, so that's next.

#### Validation of Individual Arguments via `ajv`

When we think of a JSON schema, we tend to think, "I have this JSON file and I want to validate it against the schema". That's valid, and in fact Appium does just that with config files! However, Appium does not do this when validating arguments.

> Note: During implementation, I was tempted to mash all of the arguments together into a config-file-like data structure and then validate it all at once. I think that would have been _possible_, but since an object full of CLI arguments is a flat key/value structure and the schema is not, this seemed like trouble.

Instead, Appium validates a value against a specific property _within_ the schema. To do this, it maintains a mapping between a CLI argument definition and its corresponding property. The mapping itself is a `Map` with a unique identifier for the argument as the key, and an `ArgSpec` (`lib/schema/arg-spec.js`) object as the value.

An `ArgSpec` object stores the following metadata:

| Property Name   | Description                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| `name`          | Canonical name of the argument, corresponding to the property name in the schema.     |
| `extType?`      | `driver` or `plugin`, if appropriate                                                  |
| `extName?`      | Extension name, if appropriate                                                        |
| `ref`           | Computed `$id` of the property in the schema                                          |
| `arg`           | Argument as accepted on CLI, without leading dashes                                   |
| `dest`          | Property name in parsed arguments object (as returned by `argparse`'s `parse_args()`) |
| `defaultValue?` | Value of the `default` keyword in schema, if appropriate                              |

When a schema is [finalized](#schema-finalization), the `Map` is populated with `ArgSpec` objects for all known arguments.

So when the adapter is creating the pipeline of functions for the argument's `type`, it already has an `ArgSpec` for the argument. It creates a function which calls `validate(value, ref)` (in `lib/schema/schema.js`) where `value` is whatever the user provided, and `ref` is the `ref` property of the `ArgSpec`. The concept is that `ajv` can validate using _any_ `ref` it knows about; each property in a schema can be referenced by this `ref` whether it's defined or not. To help visualize, if a schema is:

```json
{
  "$id": "my-schema.json",
  "type": "object",
  "properties": {
    "foo": {
      "type": "number"
    }
  }
}
```

The `ref` of `foo` would be `my-schema.json#/properties/foo`. Assuming our `Ajv` instance knows about this `my-schema.json`, then we can call its `getSchema(ref)` method (which has a `schema` property, but is a misnomer nonetheless) to get a validation function; `validate(value, ref)` in `schema.js` calls this validation function.

> Note: The schema spec says a schema author can supply an explicit `$id` keyword to override this; it's unsupported by Appium at this time. If needed, extension authors must carefully use `$ref` without custom `$id`s. It's highly unlikely an extension would have a schema so complicated as to need this, however; Appium itself doesn't even use `$ref` to define its own properties!

Next, let's take a look at how Appium loads schemas. This actually happens _before_ any argument validation.

## Schema Loading

Let's ignore extensions for a moment, and start with the base schema.

When something first imports the `lib/schema/schema.js` module, an instance of an `AppiumSchema` is created. This is a singleton, and its methods are exported from the module (all of which are bound to the instance).

The constructor does very little; it instantiates an `Ajv` instance and configures it with Appium's [custom keywords](#custom-keyword-reference) and adds support for the `format` keyword via the [ajv-formats](https://npm.im/ajv-formats) module.

Otherwise, the `AppiumSchema` instance does not interact with the `Ajv` instance until its `finalize()` method (exported as `finalizeSchema()`) is called. When this method is called, we're saying "we are not going to add any more schemas; go ahead and create `ArgSpec` objects and register schemas with `ajv`".

When does finalization happen? Well:

1. When the `appium` executable begins, it _checks for and configures extensions_ (hand-wave) in `APPIUM_HOME`.
2. Only then does it start to think about arguments--it instantiates an `ArgParser`, which (as you'll recall) runs the adapter to convert the schema to arguments.
3. _Finalization happens here_--when creating the parser. Appium need the schema(s) to be registered with `ajv` in order to create validation functions for arguments.
4. Thereafter, Appium parses the arguments with the `ArgParser`.
5. Finally, decides what to do with the returned object.

Without extensions, `finalize()` still knows about the Appium base schema (`appium-config-schema.js`), and just registers that. However, step 1. above is doing a _lot of work_, so let's look at how extensions come into play.

## Extension Support

One of the design goals of this system is the following:

_An extension should be able to register custom CLI arguments with the Appium, and a user should be able to use them like any other argument_.

Previously, Appium 2.0 accepted arguments in this manner (via `--driverArgs`), but validation was hand-rolled and required extension implementors to use a custom API. It also required the user to awkwardly pass a JSON string as the configuration on the command-line. Further, no contextual help (via `--help`) existed for these arguments.

Now, by providing a schema for its options, a driver or plugin can register CLI arguments and config file schemas with Appium.

To register a schema, an extension must provide the `appium.schema` property in its `package.json`. The value may be a schema or a path to a schema. If the latter, the schema should be JSON or a CommonJS module (ESM not supported at this time, nor is YAML).

For any property in this schema, the property will appear as a CLI argument of the form `--<extension-type>-<extension-name>-<property-name>`. For example, if the `fake` driver provides a property `foo`, the argument will be `--driver-fake-foo`, and will show in `appium server --help` like any other CLI argument.

The corresponding property in a config file would be `server.<extension-type>.<extension-name>.<property-name>`, e.g.:

```json
{
  "server": {
    "driver": {
      "fake": {
        "foo": "bar"
      }
    }
  }
}
```

The naming convention described above avoids problems of one extension type having a name conflict with a different extension type.

> Note: while an extension can provide aliases via `appiumCliAliases`, "short" flags are disallowed, since all arguments from extensions are prefixed with `--<extension-type>-<extension-name>-`. The extension name and argument name will be kebab-cased for the CLI, according to [Lodash's rules](https://lodash.com/docs/4.17.15#kebabCase) around kebab-casing.

The schema object will look much like Appium's base schema, but it will only have top-level properties (nested properties are currently unsupported). Example:

```json
{
  "title": "my rad schema for the cowabunga driver",
  "type": "object",
  "properties": {
    "fizz": {
      "type": "string",
      "default": "buzz",
      "$comment": "corresponds to CLI --driver-cowabunga-fizz"
    }
  }
}
```

As written in a user's config file, this would be the `server.driver.cowabunga.fizz` property.

When extensions are loaded, the `schema` property is verified and the schema is registered with the `AppiumSchema` (it is _not_ registered with `Ajv` until `finalize()` is called).

During finalization, each registered schema is added to the `Ajv` instance. The schema is assigned an `$id` based on the extension type and name (which overrides whatever the extension provides, if anything). Schemas are also forced to disallowed unknown arguments via the `additionalProperties: false` keyword.

Behind the scenes, the base schema has `driver` and `plugin` properties which are objects. When finalized, a property is added to each--corresponding to an extension name--and the value of this property is a reference to the `$id` of a property in the extension schema. For example, the `server.driver` property will look like this:

```json
{
  "driver": {
    "cowabunga": {
      "$ref": "driver-cowabunga.json"
    }
  }
}
```

This is why we call it the "base" schema--it is _mutated_ when extensions provide schemas. The extension schemas are kept separately, but the _references_ are added to the schema before it's ultimately added to `ajv`. This works because an `Ajv` instance understands references _from_ any schema it knows about _to_ any schema it knows about.

> Note: This makes it impossible to provide a complete static schema for Appium _and_ the installed extensions (as of Nov 5 2021). A static `.json` schema _is_ generated from the base (via a Gulp task), but it does not contain any extension schemas. The static schema also has uses beyond Appium; e.g., IDEs can provide contextual error-checking of config files this way. Let's solve this?

Just like how we look up the reference ID of a particular argument in the base schema, validation of arguments from extensions happens the exact same way. If the `cowabunga` driver has the schema ID `driver-cowabunga.json`, then the `fizz` property can be referenced from any schema registered with `ajv` via `driver-cowabunga.json#/properties/fizz`. "Base" schema arguments begin with `appium.json#properties/` instead.

## Development Environment Support

During the flow of development, a couple extra tasks have been automated to maintain the base schema:

- As a post-transpilation step, a `lib/appium-config.schema.json` gets generated from `lib/schema/appium-config-schema.js` (in addition to its CJS counterpart generated by Babel). This file is under version control. It ends up being _copied_ to `build/lib/appium-config.schema.json` in this step.
- A pre-commit hook (see `scripts/generate-schema-declarations.js` in the root monorepo) generates a `types/appium-config-schema.d.ts` from the above JSON file. The types in `types/types.d.ts` depend upon this file. This file is under version control.

## Custom Keyword Reference

Keywords are defined in `lib/schema/keywords.js`.

- `appiumCliAliases`: allows a schema to express aliases (e.g., a CLI argument can be `--verbose` or `-v`). This is an array of strings. Strings shorter than three (3) characters will begin with a single dash (`-`) instead of a double-dash (`--`). Note that any argument provided by an extension will begin with a double-dash, because these are required to have the `--<extension-type>-<extension-name>-` prefix.
- `appiumCliDest`: allows a schema to specify a custom property name in the post-`argprase` arguments objects. If not set, this becomes a camelCased string.
- `appiumCliDescription`: allows a schema to override the description of the argument when displayed on the command-line. This is useful paired with `appiumCliTransformer` (or `array`/`object`-typed properties), since there's a substantial difference between what a CLI-using user can provide vs. what a config-file-using user can provide.
- `appiumCliTransformer`: currently a choice between `csv` and `json`. These are custom functions which post-process a value. They are not used when loading & validating config files, but the idea should be that they result in the same object you'd get if you used whatever the config file wanted (e.g., an array of strings). `csv` is for comma-delimited strings and CSV files; `json` is for raw JSON strings and `.json` files.
- `appiumCliIgnore`: If `true`, do not support this property on the CLI.
- `appiumDeprecated`: If `true`, the property is considered "deprecated", and will be displayed as such to the user (e.g., in the `--help` output). Note the JSON Schema draft-2019-09 introduces a new keyword `deprecated` which we should use instead if upgrading to this metaschema. When doing so, `appiumDeprecated` should itself be marked as `deprecated`.
