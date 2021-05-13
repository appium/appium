class A {
  constructor (text/*:string*/) {
    this.text = text;
  }

  getText ()/*:string*/ {
    return this.text;
  }

  throwError (mess) {
    throw new Error(mess);
  }
}

export { A };
