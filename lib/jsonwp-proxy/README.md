## appium-jsonwp-proxy

[![NPM version](http://img.shields.io/npm/v/appium-jsonwp-proxy.svg)](https://npmjs.org/package/appium-jsonwp-proxy)
[![Downloads](http://img.shields.io/npm/dm/appium-jsonwp-proxy.svg)](https://npmjs.org/package/appium-jsonwp-proxy)
[![Dependency Status](https://david-dm.org/appium/jsonwp-proxy/master.svg)](https://david-dm.org/appium/jsonwp-proxy/master)
[![devDependency Status](https://david-dm.org/appium/jsonwp-proxy/master/dev-status.svg)](https://david-dm.org/appium/jsonwp-proxy/master#info=devDependencies)

[![Build Status](https://api.travis-ci.org/appium/jsonwp-proxy.png?branch=2.0)](https://travis-ci.org/appium/jsonwp-proxy)
[![Coverage Status](https://coveralls.io/repos/appium/jsonwp-proxy/badge.svg?branch=master)](https://coveralls.io/r/appium/jsonwp-proxy?branch=master)

Proxy middleware for the Selenium [JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md). Allows


### Usage

The proxy is used by instantiating with the details of the Selenium server to which to proxy. The options for the constructor are passed as a hash with the following possible member:

- `scheme` - defaults to 'http'
- `server` - defaults to 'localhost'
- `port` - defaults to `4444`
- `base` - defaults to '/wd/hub'
- `sessionId` - the session id of the session on the remote server

Once the proxy is created, there are two `async` methods:

`command (url, method, body)`

Sends a "command" to the proxied server, using the "url", which is the endpoing, with the HTTP method and optional body.

```js
import JWProxy from 'appium-jsonwp-proxy';

let host = 'my.host.com';
let port = 4445;

let proxy = new JWProxy({server: host, port: port});

// get the Selenium server status
let seStatus = await proxy.command('/status', 'GET');
```

`proxyReqRes (req, res)`

Proxies a request and response to the proxied server. Used to handle the entire conversation of a request/response cycle.

```js
import JWProxy from 'appium-jsonwp-proxy';
import http from 'http';

let host = 'my.host.com';
let port = 4445;

let proxy = new JWProxy({server: host, port: port});


http.createServer(function (req, res) {
  await proxy.proxyReqRes(res, res);
}).listen(9615);
```
