/* eslint-disable import/no-unresolved */
import { A } from '../lib/a';


describe('a-throw', function () {
  it('should throw', function () {
    let a = new A('hello world!');
    a.throwError('This is really bad!');
  });
});
