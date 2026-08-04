import assert from 'node:assert/strict';
import {describe, it, beforeEach} from 'node:test';

import {SecureValuesPreprocessor} from '../../lib/secure-values-preprocessor';

describe('Log Internals', function () {
  let preprocessor: SecureValuesPreprocessor;

  beforeEach(function () {
    preprocessor = new SecureValuesPreprocessor();
  });

  it('should preprocess a string and make replacements', async function () {
    const issues = await preprocessor.loadRules(['yolo']);
    assert.strictEqual(issues.length, 0);
    assert.strictEqual(preprocessor.rules.length, 1);
    const replacer = preprocessor.rules[0].replacer;
    assert.strictEqual(preprocessor.preprocess(':yolo" yo Yolo yyolo'), `:${replacer}" yo Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple simple rules', async function () {
    const issues = await preprocessor.loadRules(['yolo', 'yo']);
    assert.strictEqual(issues.length, 0);
    assert.strictEqual(preprocessor.rules.length, 2);
    const replacer = preprocessor.rules[0].replacer;
    assert.strictEqual(preprocessor.preprocess(':yolo" yo Yolo yyolo'), `:${replacer}" ${replacer} Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple complex rules', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      {text: 'yolo', flags: 'i'},
      {pattern: '^:', replacer: replacer2},
    ]);
    assert.strictEqual(issues.length, 0);
    assert.strictEqual(preprocessor.rules.length, 2);
    const replacer = preprocessor.rules[0].replacer;
    assert.strictEqual(
      preprocessor.preprocess(':yolo" yo Yolo yyolo'),
      `${replacer2}${replacer}" yo ${replacer} yyolo`,
    );
  });

  it(`should preprocess a string and apply a rule where 'pattern' has priority over 'text'`, async function () {
    const replacer = '***';
    const issues = await preprocessor.loadRules([{pattern: '^:', text: 'yo', replacer}]);
    assert.strictEqual(issues.length, 0);
    assert.strictEqual(preprocessor.rules.length, 1);
    assert.strictEqual(preprocessor.preprocess(':yolo" yo Yolo yyolo'), `${replacer}yolo" yo Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple complex rules and issues', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      {text: 'yolo', flags: 'i'},
      {pattern: '^:(', replacer: replacer2},
    ]);
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(preprocessor.rules.length, 1);
    const replacer = preprocessor.rules[0].replacer;
    assert.strictEqual(preprocessor.preprocess(':yolo" yo Yolo yyolo'), `:${replacer}" yo ${replacer} yyolo`);
  });

  it('should preprocess values starting or ending with non-word characters', async function () {
    const issues = await preprocessor.loadRules(['P@ssw0rd!', '+15550100', '#hunter2']);
    assert.strictEqual(issues.length, 0);
    const replacer = preprocessor.rules[0].replacer;
    assert.strictEqual(
      preprocessor.preprocess('P@ssw0rd! call +15550100 tag #hunter2'),
      `${replacer} call ${replacer} tag ${replacer}`,
    );
  });

  it(`should preprocess a value with non-word characters given as 'text'`, async function () {
    const issues = await preprocessor.loadRules([{text: '$ecret'}]);
    assert.strictEqual(issues.length, 0);
    const replacer = preprocessor.rules[0].replacer;
    assert.strictEqual(preprocessor.preprocess('the token is $ecret'), `the token is ${replacer}`);
  });

  it('should not preprocess a value which is a part of a longer word', async function () {
    const issues = await preprocessor.loadRules(['yolo']);
    assert.strictEqual(issues.length, 0);
    assert.strictEqual(preprocessor.preprocess('yolos yyolo'), 'yolos yyolo');
  });

  it('should leave the string unchanged if all rules have issues', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([null, {flags: 'i'}, {pattern: '^:(', replacer: replacer2}] as any);
    assert.strictEqual(issues.length, 3);
    assert.strictEqual(preprocessor.rules.length, 0);
    assert.strictEqual(preprocessor.preprocess(':yolo" yo Yolo yyolo'), ':yolo" yo Yolo yyolo');
  });
});
