"use strict";

var _ = require('underscore');

/*
 * derived from jQuery Cookie Plugin v1.4.1
 * https://github.com/carhartl/jquery-cookie
 */

module.exports = function (cookieString) {

  var pluses = /\+/g;

  function encode(s) {
    return encodeURIComponent(s);
  }

  function decode(s) {
    return decodeURIComponent(s);
  }

  function parseCookieValue(s) {
    if (s.indexOf('"') === 0) {
      // This is a quoted cookie as according to RFC2068, unescape...
      s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    try {
      // Replace server-side written pluses with spaces.
      // If we can't decode the cookie, ignore it, it's unusable.
      // If we can't parse the cookie, ignore it, it's unusable.
      return decodeURIComponent(s.replace(pluses, ' '));
    } catch (e) {}
  }

  function read(s, converter) {
    var value = parseCookieValue(s);
    return _.isFunction(converter) ? converter(value) : value;
  }

  this.cookie = this.cookies = function (key, value, options) {

    // Write

    if (arguments.length > 1 && !_.isFunction(value)) {
      options = _.extend({}, options);

      var ret = [
        encode(key), '=', value,
        options.expires ? '; expires=' + options.expires : '', // use expires attribute, max-age is not supported by IE
        options.path    ? '; path=' + options.path : '',
        options.domain  ? '; domain=' + options.domain : '',
        options.secure  ? '; secure' : ''
      ].join('');
      return ret;
    }

    // Read

    var result = key ? undefined : {};

    // To prevent the for loop in the first place assign an empty array
    // in case there are no cookies at all. Also prevents odd result when
    // calling this.cookie().
    var cookies = cookieString ? cookieString.split('; ') : [];

    for (var i = 0, l = cookies.length; i < l; i++) {
      var parts = cookies[i].split('=');
      var name = decode(parts.shift());
      var cookie = parts.join('=');

      if (key && key === name) {
        // If second argument (value) is a function it's a converter...
        result = read(cookie, value);
        break;
      }

      // Prevent storing a cookie that we couldn't decode.
      if (!key && (cookie = read(cookie)) !== undefined) {
        result[name] = cookie;
      }
    }

    return result;
  };

  this.removeCookie = function (key, options) {
    // Must not alter options, thus extending a fresh object...
    return this.cookie(key, '', _.extend({}, options, {
      expires: "Thu, 01 Jan 1970 00:00:00 GMT" }));
  };

};
