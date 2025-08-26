---
title: Appium Clients
---

You need a client to write and run Appium scripts. You'll want to become very
familiar with your client documentation (as well as the documentation of any Selenium client that
the Appium client depends on) since that will be your primary interface to Appium.

To learn more about clients, check out the [Client Intro](../intro/clients.md).

!!! note

    If you maintain an Appium client that you would like to be listed here, feel free to create a PR!

## Official Clients

These clients are currently maintained by the Appium team:

### [Java Client](https://github.com/appium/java-client)

Language: :fontawesome-brands-java: Java

=== "Setup With Maven"

    ```xml
    <dependency>
      <groupId>io.appium</groupId>
      <artifactId>java-client</artifactId>
      <version>${version.you.require}</version>
      <scope>test</scope>
    </dependency>
    ```
=== "Setup With Gradle"

    ```groovy
    dependencies {
      testImplementation 'io.appium:java-client:${version.you.require}'
    }
    ```

### [Python Client](https://github.com/appium/python-client)

Language: :fontawesome-brands-python: Python

```sh title="Install From PyPi"
pip install Appium-Python-Client
```

### [Ruby Core Client](https://github.com/appium/ruby_lib_core)

Language: :material-language-ruby: Ruby

```sh title="Install From RubyGems"
gem install appium_lib_core
```

### [Ruby Client](https://github.com/appium/ruby_lib)

Language: :material-language-ruby: Ruby

This client is a wrapper for the Ruby Core Client with additional helper methods, though they may
also result in additional complexity. For this reason, the Ruby Core Client is recommended instead.

```sh title="Install From RubyGems"
gem install appium_lib
```

### [.NET Client](https://github.com/appium/dotnet-client)

Language: :simple-dotnet: C#

```sh title="Install Using .NET CLI"
dotnet add package Appium.WebDriver
```

## Other Clients

These clients are not maintained by the Appium team and can be used with other languages.

In general, any W3C WebDriver spec-compatible client will also integrate well with Appium, though
some Appium-specific commands may not be implemented in other clients.

### [WebdriverIO](https://webdriver.io/docs/appium)

Language: :material-language-javascript: :material-language-typescript: JavaScript/TypeScript

```sh title="Install Using npm"
npm install @wdio/appium-service
```

### [Nightwatch.js](https://nightwatchjs.org/guide/mobile-app-testing/introduction.html)

Language: :material-language-javascript: :material-language-typescript: JavaScript/TypeScript

=== "Setup For Android"

    ```sh
    npx @nightwatch/mobile-helper android --appium
    ```

=== "Setup For iOS"

    ```sh
    npx @nightwatch/mobile-helper ios --appium
    ```

### [RobotFramework AppiumLibrary](https://github.com/serhatbolsu/robotframework-appiumlibrary)

Language: :simple-robotframework: Robot Framework

```sh title="Install From PyPi"
pip install robotframework-appiumlibrary
```

### [multicatch's appium-client](https://github.com/multicatch/appium-client)

Language: :simple-rust: Rust

```sh title="Install Using Cargo"
cargo add appium-client
```

### [SwiftAppium](https://github.com/milcgroup/swiftappium)

Language: :material-language-swift: Swift

```sh title="Install and Setup"
git clone https://github.com/milcgroup/SwiftAppium.git
cd SwiftAppium
swift build
swift run swiftappium
```
