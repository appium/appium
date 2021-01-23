import fs from 'fs';
import path from 'path';

const XML_IOS = fs.readFileSync(path.resolve(__dirname, 'ios.xml'), 'utf8').trim();
const XML_IOS_TRANSFORMED = fs.readFileSync(path.resolve(__dirname, 'ios-transformed.xml'), 'utf8').trim();
const XML_IOS_TRANSFORMED_INDEX_PATH = fs.readFileSync(path.resolve(__dirname, 'ios-transformed-path.xml'), 'utf8').trim();
const XML_IOS_EDGE = fs.readFileSync(path.resolve(__dirname, 'ios-edge.xml'), 'utf8').trim();
const XML_IOS_EDGE_TRANSFORMED = fs.readFileSync(path.resolve(__dirname, 'ios-transformed-edge.xml'), 'utf8').trim();
const XML_ANDROID = fs.readFileSync(path.resolve(__dirname, 'android.xml'), 'utf8').trim();
const XML_ANDROID_TRANSFORMED = fs.readFileSync(path.resolve(__dirname, 'android-transformed.xml'), 'utf8').trim();
const XML_ANDROID_TRANSFORMED_INDEX_PATH = fs.readFileSync(path.resolve(__dirname, 'android-transformed-path.xml'), 'utf8').trim();

export { XML_IOS, XML_ANDROID, XML_IOS_TRANSFORMED, XML_ANDROID_TRANSFORMED, XML_IOS_TRANSFORMED_INDEX_PATH,
  XML_ANDROID_TRANSFORMED_INDEX_PATH, XML_IOS_EDGE, XML_IOS_EDGE_TRANSFORMED };
