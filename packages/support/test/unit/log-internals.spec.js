import { fs } from '../../lib/index';
import os from 'os';
import path from 'path';
import { SecureValuesPreprocessor } from '../../lib/log-internal';


const CONFIG_PATH = path.resolve(os.tmpdir(), 'rules.json');




describe('Log Internals', function () {
  let preprocessor;

  beforeEach(function () {
    preprocessor = new SecureValuesPreprocessor();
  });

  it('should preprocess a string and make replacements', async function () {
    const issues = await preprocessor.loadRules([
      'yolo',
    ]);
    issues.length.should.eql(0);
    preprocessor.rules.length.should.eql(1);
    const replacer = preprocessor.rules[0].replacer;
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(`:${replacer}" yo Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple simple rules', async function () {
    const issues = await preprocessor.loadRules([
      'yolo',
      'yo',
    ]);
    issues.length.should.eql(0);
    preprocessor.rules.length.should.eql(2);
    const replacer = preprocessor.rules[0].replacer;
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(`:${replacer}" ${replacer} Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple complex rules', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      { text: 'yolo', flags: 'i' },
      { pattern: '^:', replacer: replacer2 },
    ]);
    issues.length.should.eql(0);
    preprocessor.rules.length.should.eql(2);
    const replacer = preprocessor.rules[0].replacer;
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(`${replacer2}${replacer}" yo ${replacer} yyolo`);
  });

  it(`should preprocess a string and apply a rule where 'pattern' has priority over 'text'`, async function () {
    const replacer = '***';
    const issues = await preprocessor.loadRules([
      { pattern: '^:', text: 'yo', replacer },
    ]);
    issues.length.should.eql(0);
    preprocessor.rules.length.should.eql(1);
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(`${replacer}yolo" yo Yolo yyolo`);
  });

  it('should preprocess a string and make replacements with multiple complex rules and issues', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      { text: 'yolo', flags: 'i' },
      { pattern: '^:(', replacer: replacer2 },
    ]);
    issues.length.should.eql(1);
    preprocessor.rules.length.should.eql(1);
    const replacer = preprocessor.rules[0].replacer;
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(`:${replacer}" yo ${replacer} yyolo`);
  });

  it('should leave the string unchanged if all rules have issues', async function () {
    const replacer2 = '***';
    const issues = await preprocessor.loadRules([
      null,
      { flags: 'i' },
      { pattern: '^:(', replacer: replacer2 },
    ]);
    issues.length.should.eql(3);
    preprocessor.rules.length.should.eql(0);
    preprocessor.preprocess(':yolo" yo Yolo yyolo').should.eql(':yolo" yo Yolo yyolo');
  });

  it('should fail if rules cannot be accessed', async function () {
    await preprocessor.loadRules('bla').should.eventually.be.rejected;
  });

  it('should fail if rules JSON cannot be parsed', async function () {
    await fs.writeFile(CONFIG_PATH, 'blabla', 'utf8');
    await preprocessor.loadRules(CONFIG_PATH).should.eventually.be.rejected;
  });
});
