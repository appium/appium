This documentation is deprecated. Please refer to [the README in the Appium repository](https://github.com/appium/appium) or [Appium 2.0 documentation](http://appium.io/).

## Cross-domain iFrame Automation

[Same-origin policy](https://en.wikipedia.org/wiki/Same-origin_policy) prevents Appium from automating iFrames that have a different domain to the parent.

### Subdomain workaround
If the parent and the iFrame share the same domain (e.g. `site.com` and `shop.site.com`), you can
set `document.domain` on both the parent and each iFrame to a common domain. This solves the same-origin policy issue and allows automation. For example:

Parent:
```
<html>
  <head>
    <script>
      document.domain = 'site.com';
    </script>
  </head>
  <body>
    <iframe src="http://shop.site.com" width="200" height="200"></iframe>
  </body>
</html>
```

Child iFrame:
```
<html>
  <head>
    <script>
      document.domain = 'site.com';
    </script>
  </head>
  <body>
    <p>This is an iFrame!</p>
  </body>
</html>
```
