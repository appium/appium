## appium-jsonwp-proxy

Proxy middleware for the Selenium [JSON Wire Protocol](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md). Allows


### Usage

The proxy is used by instantiating with the details of the Selenium server to which to proxy. The options for the constructor are passed as a hash with the following possible members:

- `scheme` - defaults to 'http'
- `server` - defaults to 'localhost'
- `port` - defaults to `4444`
- `base` - defaults to ''
- `sessionId` - the session id of the session on the remote server
- `reqBasePath` - the base path of the server which the request was originally sent to (defaults to '')

Once the proxy is created, there are two `async` methods:

`command (url, method, body)`

Sends a "command" to the proxied server, using the "url", which is the endpoing, with the HTTP method and optional body.

```js
import { JWProxy } from 'appium-base-driver';

let host = 'my.host.com';
let port = 4445;

let proxy = new JWProxy({server: host, port: port});

// get the Selenium server status
let seStatus = await proxy.command('/status', 'GET');
```

`proxyReqRes (req, res)`

Proxies a request and response to the proxied server. Used to handle the entire conversation of a request/response cycle.

```js
import { JWProxy } from 'appium-base-driver';
import http from 'http';

let host = 'my.host.com';
let port = 4445;

let proxy = new JWProxy({server: host, port: port});


http.createServer(function (req, res) {
  await proxy.proxyReqRes(res, res);
}).listen(9615);
```
