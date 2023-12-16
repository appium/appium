---
hide:
  - toc

title: SSL/TLS/SPDY Support
---

Appium 2.2 introduces the option to start the Appium server with SSL/TLS support. 

## Command Line Arguments
In order to enable secure connections to the server, you need to provide the following command
line arguments:

```bash
appium server --ssl-cert-path=/path/to/cert.pem --ssl-key-path=/path/to/key.pem
```

Both arguments must be provided and should contain paths to a valid
[X509 PEM](https://www.ssl.com/guide/pem-der-crt-and-cer-x-509-encodings-and-conversions/)
certificate and its corresponding private key.

After the server is started use the `https` protocol and a client supporting SSL/TLS or
[SPDY](https://en.wikipedia.org/wiki/SPDY) to communicate to it.

### Supported Features

Once a secure server socket is established it supports the following protocols:
`['h2', 'spdy/3.1', 'spdy/3', 'spdy/2', 'http/1.1', 'http/1.0']`. See
[the SPDY node module documentation](https://www.npmjs.com/package/spdy) to get more details about
its features. All insecure client connections will be rejected by the server.

### Self-Signed Certificates

Use the following command in order to generate a self-signed certificate/key pair:

```bash
openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -subj "/C=US/ST=State/L=City/O=company/OU=Com/CN=www.testserver.local"
```

Feel free to change the value of `-subj` in the command above with your matching details. The server
should work just fine with a self-signed certificate, although you need to take care about a proper
client setup, e.g. make sure it does not reject unauthorized certificates.
