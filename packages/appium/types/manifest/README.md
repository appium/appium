# appium-manifest types

This dir contains versioned type declarations for our manifest file (`extensions.yaml`).

## About

Originally, the manifest file was versioned; it had a `schemaRev` prop.  Eventually, the requirement for this prop was dropped, and became optional.  As of this writing, it is now required again.  

The idea was that if Appium found an `extensions.yaml` with a `schemaRev` lower than its "current" revision, it would "migrate" the file to the current revision.  When we removed the requirement for the `schemaRev` prop, we removed this logic.

As of _v3_ of the schema, we are reinstating versioning and migrations.

## How To Add A New Version

The manifest file types—and thus its format—is composed of types used elsewhere in our codebase.  This is probably a design flaw, but the fact remains that the manifest file's format is strongly coupled to Appium's extension-handling logic.

For that reason, it is _non-trivial_ to reuse the types declared by older revisions to declare a new revision.  If and when someone de-couples the types from the schema, we will have to use the _copy-and-paste_ strategy to create a new version.

1. The current version of the schema is defined in `constants.js` as `CURRENT_SCHEMA_REV`.  **Increment** this value.
2. **Copy** the `.ts` file in this directory corresponding to the (now old) current version of the schema into a new file named `v<new-version>.ts`.  For example, if the current version is `3`, and you're creating `4`, then you would copy `v3.ts` to `v4.ts`.
3. **Modify** your new file to do whatever it is you need to do with it.  Do _not_ build types upon old versions of the schema.
4. **Modify** `index.ts`:
   1. **Append** `import * as ManifestV<new-version> from './v<new-version>'`
   2. **Replace** `export * from './v<current-version>'` with `export * from './v<new-version>'`
   3. **Append** `ManifestV<new-version>` to the `export {ManifestV...}` line.
   4. **Append** a key/value pair to `ManifestDataVersions` with the new _numeric_ version number as the key and the value `ManifestV<new-version>.ManifestData`.
5. **Create** a new `const SCHEMA_REV_<new-version> = <new-version>` in `manifest-migrations.js`.
6. Finally, **append** a new key/value pair to the `Migrations` object in `manifest-migrations.js`.  The key should be a reference to the constant created in step 5, and the value should be a function which  performs the migration from the (old) current version to the new version.

-- @boneskull, Nov 8 2022
