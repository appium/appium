// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/
"use strict";

var _ = require('underscore')
  , au = require('../../lib/xpath.js');

describe("XPath lookups", function() {
  var oks = {
    "//button": {path: [{node: 'button', search: 'desc', index: null}]}
    , "//button[last()]": {path: [{node: 'button', search: 'desc', index: -1}]}
    , "//button[1]": {path: [{node: 'button', search: 'desc', index: 1}]}
    , "/button": {path: [{node: 'button', search: 'child', index: null}]}
    , "/but.ton": {path: [{node: 'but.ton', search: 'child', index: null}]}
    , "/button[2]": {path: [{node: 'button', search: 'child', index: 2}]}
    , "button": {path: [{node: 'button', search: 'desc', index: null}]}
    , "//button/text/webview": {path: [
        {node: 'button', search: 'desc', index: null}
        , {node: 'text', search: 'child', index: null}
        , {node: 'webview', search: 'child', index: null}]}
    , "//button[1]/text/webview[3]": {path: [
        {node: 'button', search: 'desc', index: 1}
        , {node: 'text', search: 'child', index: null}
        , {node: 'webview', search: 'child', index: 3}]}
    , "text/webview//button": {path: [
        {node: 'text', search: 'desc', index: null}
        , {node: 'webview', search: 'child', index: null}
        , {node: 'button', search: 'desc', index: null}]}
    , "//button[@name='hi there']": {
        attr: 'name', constraint: 'hi there', substr: false}
    , "//button[@other_attr='hi there']": {
        attr: 'other_attr', constraint: 'hi there', substr: false}
    , '//button[@name="hi there"]': {
        attr: 'name', constraint: 'hi there', substr: false}
    , '//list/button[@name="hi there"]': {
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
    , "//button[-1]"
    , "//button[last]"
    , "//button[last(]"
    , "//button[@name$='hi']"
    , "//tag_name"
    , "//button[0]"
    , "//button[]"
    , "//button]"
    , "//button["
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
