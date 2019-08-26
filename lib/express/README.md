## appium-express

[Express](http://expressjs.com/) server tuned for to serve [Appium](http://appium.io/).


### Configuration

The `appium-express` server comes configured with:

1. appropriate logging formats
2. service of necessary static assets
3. allowance of cross-domain requests
4. default error handling
5. fix for invalid content types sent by certain clients

To configure routes, a function that takes an Express server is passed into the
server. This function can add whatever routes are wanted.


### Usage

```js
import { server } from 'appium-base-driver';


// configure the routes
function configureRoutes (app) {
  app.get('/hello', (req, res) => {
    res.header['content-type'] = 'text/html';
    res.status(200).send('Hello');
  });
  app.get('/world', (req, res) => {
    res.header['content-type'] = 'text/html';
    res.status(200).send('World');
  });
}

const port = 5000;
const host = 'localhost';

const appiumServer = await server({
  routeConfiguringFunction,
  port,
  host,
});
```


## Watch

```
npm run watch
```

## Test

```
npm test
```
