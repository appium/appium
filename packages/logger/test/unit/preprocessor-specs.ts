import {expect} from 'chai';
import {SecureValuesPreprocessor} from '../../lib/secure-values-preprocessor';

describe('Log Internals', function () {
  let preprocessor: SecureValuesPreprocessor;

  beforeEach(function () {
    preprocessor = new SecureValuesPreprocessor();
  });

  it('should preprocess a string and make replacements', async function () {
    const issues = await preprocessor.loadRules(['yolo']);
    expect(issues.length).to.eql(0);
    expect(preprocessor.rules.length).to.eql(1);
    const replacer = preprocessor.rules[0].replacer;
    expect(preprocessor.preprocess(':yolo" yo Yolo yyolo')).to.eql(`:${replacer}" yo Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple simple rules', async function () {
    const issues = await preprocessor.loadRules(['yolo', 'yo']);
    expect(issues.length).to.eql(0);
    expect(preprocessor.rules.length).to.eql(2);
    const replacer = preprocessor.rules[0].replacer;
    expect(preprocessor.preprocess(':yolo" yo Yolo yyolo')).to.eql(
      `:${replacer}" ${replacer} Yolo yyolo`
    );
  });

  it('should preprocess a string and make replacements with multiple complex rules', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      {text: 'yolo', flags: 'i'},
      {pattern: '^:', replacer: replacer2},
    ]);
    expect(issues.length).to.eql(0);
    expect(preprocessor.rules.length).to.eql(2);
    const replacer = preprocessor.rules[0].replacer;
    expect(preprocessor.preprocess(':yolo" yo Yolo yyolo')).to.eql(
      `${replacer2}${replacer}" yo ${replacer} yyolo`
    );
  });

  it(`should preprocess a string and apply a rule where 'pattern' has priority over 'text'`, async function () {
    const replacer = '***';
    const issues = await preprocessor.loadRules([{pattern: '^:', text: 'yo', replacer}]);
    expect(issues.length).to.eql(0);
    expect(preprocessor.rules.length).to.eql(1);
    expect(preprocessor.preprocess(':yolo" yo Yolo yyolo')).to.eql(
      `${replacer}yolo" yo Yolo yyolo`
    );
  });

  it('should preprocess a string and make replacements with multiple complex rules and issues', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      {text: 'yolo', flags: 'i'},
      {pattern: '^:(', replacer: replacer2},
    ]);
    expect(issues.length).to.eql(1);
    expect(preprocessor.rules.length).to.eql(1);
    const replacer = preprocessor.rules[0].replacer;
    expect(preprocessor.preprocess(':yolo" yo Yolo yyolo')).to.eql(
      `:${replacer}" yo ${replacer} yyolo`
    );
  });

  it('should leave the string unchanged if all rules have issues', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      null,
      {flags: 'i'},
      {pattern: '^:(', replacer: replacer2},
    ] as any);
    expect(issues.length).to.eql(3);
    expect(preprocessor.rules.length).to.eql(0);
    expect(preprocessor.preprocess(':yolo" yo Yolo yyolo')).to.eql(':yolo" yo Yolo yyolo');
  });
});
