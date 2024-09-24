import {SecureValuesPreprocessor} from '../../lib/secure-values-preprocessor';

describe('Log Internals', function () {
  /** @type {import('../../lib/secure-values-prepreocessor').SecureValuesPreprocessor} */
  let preprocessor;

  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  beforeEach(function () {
    preprocessor = new SecureValuesPreprocessor();
  });

  it('should preprocess a string and make replacements', async function () {
    const issues = await preprocessor.loadRules(['yolo']);
    issues.length.should.eql(0);
    preprocessor.rules.length.should.eql(1);
    const replacer = preprocessor.rules[0].replacer;
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(`:${replacer}" yo Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple simple rules', async function () {
    const issues = await preprocessor.loadRules(['yolo', 'yo']);
    issues.length.should.eql(0);
    preprocessor.rules.length.should.eql(2);
    const replacer = preprocessor.rules[0].replacer;
    preprocessor
      .preprocess(':yolo" yo Yolo yyolo')
      .should.eql(`:${replacer}" ${replacer} Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple complex rules', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      {text: 'yolo', flags: 'i'},
      {pattern: '^:', replacer: replacer2},
    ]);
    issues.length.should.eql(0);
    preprocessor.rules.length.should.eql(2);
    const replacer = preprocessor.rules[0].replacer;
    preprocessor
      .preprocess(':yolo" yo Yolo yyolo')
      .should.eql(`${replacer2}${replacer}" yo ${replacer} yyolo`);
  });

  it(`should preprocess a string and apply a rule where 'pattern' has priority over 'text'`, async function () {
    // NOTE: this is disallowed in the config schema, but is currently allowed when using an external JSON file.
    const replacer = '***';
    const issues = await preprocessor.loadRules([{pattern: '^:', text: 'yo', replacer}]);
    issues.length.should.eql(0);
    preprocessor.rules.length.should.eql(1);
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(`${replacer}yolo" yo Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple complex rules and issues', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      {text: 'yolo', flags: 'i'},
      {pattern: '^:(', replacer: replacer2},
    ]);
    issues.length.should.eql(1);
    preprocessor.rules.length.should.eql(1);
    const replacer = preprocessor.rules[0].replacer;
    preprocessor
      .preprocess(':yolo" yo Yolo yyolo')
      .should.eql(`:${replacer}" yo ${replacer} yyolo`);
  });

  it('should leave the string unchanged if all rules have issues', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      null,
      {flags: 'i'},
      {pattern: '^:(', replacer: replacer2},
    ]);
    issues.length.should.eql(3);
    preprocessor.rules.length.should.eql(0);
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(':yolo" yo Yolo yyolo');
  });
});
