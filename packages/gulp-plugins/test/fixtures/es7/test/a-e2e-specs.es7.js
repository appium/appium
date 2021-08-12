/* eslint-disable import/no-unresolved */
import { A } from '../lib/a';



describe('a e2e', function () {
  it('should be able to get text', function () {
    let a = new A('hello world!');
    a.getText().should.equal('hello world!');
  });
});
