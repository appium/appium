/**
 * Various data models, mostly referring to config files
 *
 * @module
 */

import type {Jsonify, JsonValue, TsConfigJson as TsConfigJsonBase} from 'type-fest';

/**
 * A `tsconfig.json` file w/ `$schema` prop
 */
export type TsConfigJson = TsConfigJsonBase & {
  $schema?: string;
};

/**
 * The `nav` prop of an `mkdocs.yml` file
 * @see {@linkcode MkDocsYml}
 */
export type MkDocsYmlNav = Array<string | Record<string, string> | Record<string, MkDocsYmlNav>>;

/**
 * This was built by hand from the MkDocs documentation
 * @see https://www.mkdocs.org/user-guide/configuration/
 */
export type MkDocsYml = Jsonify<{
  copyright?: string;
  dev_addr?: string;
  docs_dir?: string;
  extra_css?: string[];
  extra_javascript?: string[];
  extra_templates?: string[];
  extra?: Record<string, JsonValue>;
  hooks?: string[];
  INHERIT?: string;
  markdown_extensions?: Array<string | Record<string, JsonValue>>;
  nav?: MkDocsYmlNav;
  plugins?: Array<string | Record<string, JsonValue>>;
  repo_name?: string;
  repo_url?: string;
  site_dir?: string;
  /**
   * This is _actually_ required by mkdocs
   */
  site_name?: string;
  site_description?: string;
  strict?: boolean;
  theme?: MkDocsYmlTheme;
  use_directory_urls?: boolean;
  watch?: string[];
}>;

/**
 * The `theme` prop of an `mkdocs.yml`
 * @see {@linkcode MkDocsYml}
 */
export type MkDocsYmlTheme =
  | string
  | ({
      name: string;
      locale?: string;
      custom_dir?: string;
      static_templates?: string[];
    } & Record<string, JsonValue>);

/**
 * The data parsed from a `requirements.txt` file, or the output of `pip list --json`
 */
export interface PipPackage {
  name: string;
  version: string;
}
