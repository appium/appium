---
hide:
  - toc

title: Appiumをインストールする
---

!!! info

```
インストールする前に[システム要件](./requirements.md)を満たしているか確認してください。
```

Appium は `npm` を使用してグローバルにインストールできます：

```bash
npm install -g appium
```

!!! note

```
他のパッケージマネージャーは現在サポートされていません。
```

## Appiumを実行する

Appiumは [コマンドラインを使用して](../cli/index.md)始めることができます：

```
appium
```

このコマンドはインストールされているAppiumドライバーをすべて読み込むAppiumサーバープロセスを起動し、クライアント接続（テスト自動化スクリプトなど）から新規セッションの開始要求を待ちます。
サーバープロセスはクライアントから独立しているため、新しいセッションを開始する前に明示的に起動する必要があります。

サーバーが起動すると、コンソールログに、クライアントがこのサーバーに接続するために使用できる有効なURLがすべてリストされます：

```
[Appium] You can provide the following URLs in your client code to connect to this server:
[Appium] 	http://127.0.0.1:4723/ (only accessible from the same host)
(... any other URLs ...)
```

クライアントが新規セッションを要求すると、Appium サーバープロセスは、このセッションが終了するまで、このセッションに関するすべての詳細のログ記録を開始します。 覚えておいてください。Appium テストで問題が発生した場合は、いつでもサーバー ログで詳細を確認できます。

次は何でしょうか？ Appium はインストールされて実行されていますが、ドライバーがバンドルされていないため、まだ何も自動化できません。 そこで、Android向けに自動化を設定します。[Installing the UiAutomator2 Driver](./uiauto2-driver.md)へ続く。
