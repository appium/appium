// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/
/*global describe:true, it:true */
"use strict";

var should = require('should')
  , _ = require('underscore')
  , au = require('../../uiauto/appium/xpath.js');

describe("XPath lookups", function() {
  var oks = {
    "//button": {path: [{node: 'button', search: 'desc'}]}
    , "/button": {path: [{node: 'button', search: 'child'}]}
    , "button": {path: [{node: 'button', search: 'desc'}]}
    , "//button/text/webview": {path: [
        {node: 'button', search: 'desc'}
        , {node: 'text', search: 'child'}
        , {node: 'webview', search: 'child'}]}
    , "text/webview//button": {path: [
        {node: 'text', search: 'desc'}
        , {node: 'webview', search: 'child'}
        , {node: 'button', search: 'desc'}]}
    , "//button[@name='hi there']": {
        attr: 'name', constraint: 'hi there', substr: false}
    , "//button[@other_attr='hi there']": {
        attr: 'other_attr', constraint: 'hi there', substr: false}
    , '//button[@name="hi there"]': {
        attr: 'name', constraint: 'hi there', substr: false}
    , '//button[@name=hi there]': {
        attr: 'name', constraint: 'hi there', substr: false}
    , '//button[contains(@label, "hi")]': {
        attr: 'label', constraint: 'hi', substr: true}
    , '//button[contains(@other_attr, "hi")]': {
        attr: 'other_attr', constraint: 'hi', substr: true}
    , "//button[contains(@label, 'hi')]": {
        attr: 'label', constraint: 'hi', substr: true}
    , "//button[contains(@label, what's up dog)]": {
        attr: 'label', constraint: "what's up dog", substr: true}
    , "//*[contains(@text, 'agree')]": {
      attr: 'text', constraint: 'agree', substr: true}
    , "//*[@text='agree']": {
      attr: 'text', constraint: 'agree', substr: false}
  };
  var notOks = [
    , "//button123"
    , "//button[@name$='hi']"
    , "//tag_name"
    , "//button[something(@name, 'hi')]"
    , "//button[noat='wut']"
    , "//button/label[@name='hi']/moar"
    , "//@attr"
  ];
  describe("Valid XPaths", function() {
    _.each(oks, function(test, xpath) {
      it(xpath + " should work", function() {
        var parsed = au.parseXpath(xpath);
        parsed.should.not.equal(false);
        _.each(test, function(val, key) {
          parsed[key].should.eql(test[key]);
        });
      });
    });
  });
  describe("Invalid Xpaths", function() {
    _.each(notOks, function(xpath) {
      it(xpath + " should not work", function() {
        var parsed = au.parseXpath(xpath);
        parsed.should.equal(false);
      });
    });
  });
});
