/* eslint-disable import/no-unresolved */
/* eslint-disable no-console */
import { A } from './a';


// A expects a string, we pass an integer
let a = new A(123);

console.log(a.getText());
