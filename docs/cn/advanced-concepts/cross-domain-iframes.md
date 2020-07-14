## 跨域 iFrame 的自动化

[同源策略](https://en.wikipedia.org/wiki/Same-origin_policy) 会阻止 Appium 对和父页面不同域的 iFrame 进行自动化测试。

### 子域名的解决方案
如果父页面和 iFrame 使用同一个 domain (比如 `site.com` 和 `shop.site.com`)，你可以在父页面和 iFrame 里将 `document.domain` 设置为一个共同的domain。这就解决了同源问题。

父页面:
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

子 iFrame:
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
