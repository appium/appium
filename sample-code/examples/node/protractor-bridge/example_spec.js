/* global describe, it, browser, wdBrowser, element, by, expect, beforeEach */
"use strict";

describe('angularjs homepage', function () {
  it('should greet the named user', function () {
    browser.get('http://www.angularjs.org');

    element(by.model('yourName')).sendKeys('Julie');

    var greeting = element(by.binding('yourName'));

    expect(greeting.getText()).toEqual('Hello Julie!');
  });

  describe('todo list', function () {
    var todoList;

    beforeEach(function () {
      browser.get('http://www.angularjs.org');

      todoList = element.all(by.repeater('todo in todos'));
    });

    it('should list todos', function () {
      expect(todoList.count()).toEqual(2);
      expect(todoList.get(1).getText()).toEqual('build an angular app');
    });

    it('should add a todo', function () {
      var addTodo = element(by.model('todoText'));
      var addButton = element(by.css('[value="add"]'));

      addTodo.sendKeys('write a protractor test');
      addButton.click();

      expect(todoList.count()).toEqual(3);
      expect(todoList.get(2).getText()).toEqual('write a protractor test');
    });

    it('should be able to use wdBrowser ', function (done) {
      wdBrowser.title().then(function (title) {
        expect(title).toEqual('AngularJS — Superheroic JavaScript MVW Framework');
      }).nodeify(done);
    });

    it('should convert to wd element', function (done) {
      var el = element.all(by.repeater('todo in todos')).get(1);
      wdBrowser.wdEl(el).text().then(function (text) {
        expect(text).toEqual('build an angular app');
      }).nodeify(done);
    });

    it('should convert from wd element', function (done) {
      return wdBrowser
        .elementById('add-some-control')
        .then(function (el) {
          return wdBrowser.swEl(el).getText().then(function (text) {
            expect(text).toEqual('Add Some Control');
          });
        }).nodeify(done);
    });

  });
});
