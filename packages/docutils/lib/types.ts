/**
 * Utility types
 * @module
 */

import type {Jsonify, JsonValue, SetRequired, TsConfigJson as TsConfigJsonBase} from 'type-fest';
import type {TypeDocOptions} from 'typedoc';

/**
 * A `tsconfig.json` file w/ `$schema` prop
 */
export type TsConfigJson = Jsonify<
  TsConfigJsonBase & {
    $schema?: string;
  }
>;

/**
 * A `typedoc.json` file w/ `$schema` and `extends` props
 */
export type TypeDocJson = Jsonify<
  Partial<TypeDocOptions> & {
    $schema?: string;
    extends?: string;
  }
>;

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
  markdown_extensions?: (string | Record<string, JsonValue>)[];
  nav?: (string | Record<string, string>)[];
  plugins?: (string | Record<string, JsonValue>)[];
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

export type MkDocsYmlTheme =
  | string
  | ({
      name: string;
      locale?: string;
      custom_dir?: string;
      static_templates?: string[];
    } & Record<string, JsonValue>);
