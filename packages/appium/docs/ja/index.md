---
title: Appiumのドキュメント
---

<!---# Appium Documentation--->
# Appiumのドキュメント

<div style="text-align: center">
  <img src="assets/images/appium-logo-horiz.png" style="max-width: 400px;" />
</div>

<!---
Welcome to the Appium documentation! Appium is an open-source project and ecosystem of related
software, designed to facilitate UI automation of many app platforms, including mobile (iOS,
Android, Tizen), browser (Chrome, Firefox, Safari), desktop (macOS, Windows), TV (Roku, tvOS,
Android TV, Samsung), and more.
--->
Appiumのドキュメントにようこそ。Appiumはオープンソースプロジェクトであり、そのエコシステムは多様なプラットフォーム、例えばモバイル（iOS・Android・Tizen）やブラウザ（Chrome・Firefox・Safari）、デスクトップ（macOS・Windows）、TV（Roku・tvOS・Android TV・Samsung）に対するUI自動化を支援するために設計されています。

<!---
If you're new to Appium, it's recommended that you start off with the [Introduction](intro/), then
move on to the [Quickstart](quickstart/). And you can always find Appium's code on GitHub at
[appium/appium](https://github.com/appium/appium).
--->
もしあなたがAppiumを初めて学ぶのであれば、[はじめに](intro/)からとりかかり、[クイックスタート](quickstart/)へと進むとよいでしょう。GitHub上の[appium/appium](https://github.com/appium/appium)においてコードを確認することができます。

<!---## What is Appium for?--->
## Appiumは何のためにあるか？


<!---
Appium is used mostly in the field of software test automation, to help determine whether the
functionality of a given app is working as expected. In contrast to other types of software
testing, UI automation allows testers to write code that walks through user scenarios in the actual
UI of an application, mimicking as closely as possible what happens in the real world while
enabling the various benefits of automation, including speed, scale, and consistency.
--->

Appiumは主にソフトウェアの自動テスト領域において、テスト対象となるアプリが機能的に期待通りに動作するかを確認するために使用されます。他のソフトウェアテストとは対照的に、UI自動化では、テストエンジニアが実アプリケーションのUI上から現実世界で実際に起こることになるべく近くなるようなユーザシナリオを構築しながらも、実行速度、拡張性、一貫性といった自動化の利点を実現します。


<!---
Appium aims to provide a set of tools that support this kind of automation in a standard way across
any number of platforms. Most platforms come with tools that allow UI automation at some level, but
these are usually platform-specific and require specialized knowledge and specific programming
language experience and toolchains. Appium tries to unify all these automation technology under
a single stable interface, accessible via most popular programming languages (you can write Appium
scripts in Java, Python, Ruby, JS, and more).
--->

Appiumはいくつものプラットフォームを跨いで標準化された方法で自動化を実現するためのツール群を提供します。たいていのプラットフォームはUI自動化を大なり小なり実現可能ですが、通常はそれらはプラットフォーム固有であり、専用の知識やプログラミング言語経験、ツール群が要求されます。Appiumはそれらの自動化技術を1つの標準化されたインターフェースのもとで、広く使われるプログラミング言語（Java、Python、Ruby、JavaScriptなど）を通して利用できるように試みています。Appiumがどのようにこの目標を達成しているか、どのような要素が関係しているかを学ぶためには[導入](intro/)に進んでください。

<!--
## Learning Appium
--->
## Appiumを学ぶ

<!---
This documentation is a great way to learn more about Appium:

- Check out the [Introduction](intro/) first to make sure you understand all the concepts involved in Appium.
- Go through the [Quickstart](quickstart/) to get set up and run a basic Android test.
- Have a look at the various guides and references.
- Using Appium for a real project means using an Appium driver for a specific platform, so you'll want to have a look at the [Ecosystem](ecosystem/) page where we keep links to the drivers and plugins you might want to use; you can refer to those projects for specific information about using Appium for a given platform.
--->

Appiumをより知るために：

- まずはAppiumの考え方、構成を理解するために[導入](intro/)を確認します
- [クイックスタート](quickstart/)でAppiumの準備と基本的なAndroidのテスト実行を体験します
- いくつもの手引き、リファレンスを確認します
- 実プロジェクトでAppiumを使うということは特定のプラットフォームに向けたAppiumドライバー(Appium driver)を使うことを意味します。必要となるドライバー（drivers）やプラグイン（plugins）への各種リンクを持つ[エコシステム](ecosystem/)ページを確認します。そこでは対象とするプラットフォーム固有の情報を確認できます。

<!---
You can also check out a list of third-party [Resources](resources.md) to explore Appium around the
web.
--->

[その他](resources.md)にはWeb上にあるサードパーティ製のリストもあります。これらもAppiumを使う上で役立つでしょう。


<!---
## Contributing to Appium
--->
## Appiumに貢献する


<!---
Appium is open source, available under an Apache 2.0 license. Appium's copyright is held by the
[OpenJS Foundation](https://openjsf.org), and Appium receives contributions from many companies
across several software industries, regardless of their competitive status. (3rd-party drivers and
plugins are available under the licenses provided by their authors.)
--->

AppiumはApache 2.0 ライセンスのもと利用可能なオープンソースプロジェクトです。Appiumのコピーライト（copyright）は[OpenJS Foundation](https://openjsf.org)にあり、競合状態に関わらず、様々なソフトウェア業界を跨いで多くの企業から助けを得ます。（サードパーティ製のドライバー（drivers）やプラグイン（plugins）は各々のライセンスを持ちます。）

<!---
As such, we welcome contributions! The project moves forward in relation to the investment of
contributions of code, documentation, maintenance, and support from companies and volunteers. To
learn more about contributing, check out our GitHub repo at
[appium/appium](https://github.com/appium/appium) and read through our
[Contributing](contributing/) guides.
--->
そのため、私たちは皆様からの貢献を歓迎しています！企業やボランティアによるコード、ドキュメント、メンテナンス、サポートといった貢献により、Appiumプロジェクトは発展していきます。貢献方法に関してより知るためには、AppiumのGitHubリポジトリ（[appium/appium](https://github.com/appium/appium)）と[貢献する](contributing/)を確認してください。

## 日本語訳によせて

- 体裁は「です・ます」、コマンド名といった固有の文字はカタカナ表記、英語併記、もしくは英語をそのまま残していく予定です。

---

- Written by 松尾和昭 (Kazuaki Matsuo, @KazuCocoa)
