import path from 'node:path';
import {node, fs, util} from '@appium/support';

const THIS_PLUGIN_DIR = node.getModuleRootSync('@appium/universal-xml-plugin', __filename)!;
const FIXTURES_DIR = path.join(THIS_PLUGIN_DIR, 'test', 'fixtures');

export const FIXTURES = {
  XML_IOS: 'ios.xml',
  XML_IOS_TRANSFORMED: 'ios-transformed.xml',
  XML_IOS_TRANSFORMED_INDEX_PATH: 'ios-transformed-path.xml',
  XML_IOS_EDGE: 'ios-edge.xml',
  XML_IOS_EDGE_TRANSFORMED: 'ios-transformed-edge.xml',
  XML_ANDROID: 'android.xml',
  XML_ANDROID_TRANSFORMED: 'android-transformed.xml',
  XML_ANDROID_TRANSFORMED_INDEX_PATH: 'android-transformed-path.xml',
  XML_WEBVIEW: 'web-view.xml',
} as const;

export const readFixture = util.memoize(
  async (name: (typeof FIXTURES)[keyof typeof FIXTURES]): Promise<string> =>
    (await fs.readFile(path.resolve(FIXTURES_DIR, name), 'utf8')).trim(),
);
