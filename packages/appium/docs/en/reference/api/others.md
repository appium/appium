---
title: Other Protocols
---
<style>
  ul[data-md-component="toc"] .md-nav .md-nav {
    display: none;
  }
</style>

The following is a list of endpoints used in Appium that are defined in other protocols.

## Chromedriver Protocol

The Chromedriver protocol is an extension of the W3C WebDriver protocol, supported in Appium
clients using Chromedriver. It specifies both its own extension commands, as well as
vendor-agnostic commands.

!!! warning

    Endpoints specified by this protocol are not officially documented.

### executeCdp

```
POST /session/:sessionId/:vendor/cdp/execute
```

Executes a Chrome DevTools Protocol (CDP) method, using the implementation of the vendor identified
by `:vendor`. Refer to [the CDP documentation](https://chromedevtools.github.io/devtools-protocol/)
for a list of available methods and their parameters.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`cmd`|Name of the CDP method to execute|string|
|`params`|Parameters passed to the CDP method|object|

#### Response

`any` - the result of executing the CDP method

## Permissions Protocol

The [Permissions protocol](https://www.w3.org/TR/permissions/) is an extension of the W3C WebDriver
protocol.

### setPermissions

```
POST /session/:sessionId/permissions
```

> Permissions documentation: [Set Permission](https://www.w3.org/TR/permissions/#webdriver-command-set-permission)

Simulates user modification of the permission state of a PermissionDescriptor (a permissible feature
with optional additional properties).

#### Parameters

|<div style="width:6em">Name</div>|Description|Type|
|--|--|--|
|`descriptor`|Object specifying the feature name in its `name` key, along with any other keys for additional properties|object|
|`state`|New permission state for this descriptor. Supported values are: `granted`, `denied`, or `prompt`.|string|

#### Response

`null`

## Reporting Protocol

The [Reporting protocol](https://www.w3.org/TR/reporting-1/) is an extension of the W3C WebDriver
protocol.

### generateTestReport

```
POST /session/:sessionId/reporting/generate_test_report
```

> Reporting documentation: [Generate Test Report](https://www.w3.org/TR/reporting-1/#generate-test-report-command)

Simulates the generation of a test report, which can be retrieved by registered reporting observers.

#### Parameters

|Name|Description|Type|Default|
|--|--|--|--|
|`message`|Message displayed in the report|string||
|`group?`|Destination group to deliver the report to|string|`default`|

#### Response

`null`

## Selenium Protocol

The Selenium protocol is an extension of the W3C WebDriver protocol, supported in Appium clients
based on Selenium.

!!! warning

    Endpoints specified by this protocol are not officially documented.

### getLog

```
POST /session/:sessionId/se/log
```

Retrieves the logs for a given log type. Supported log types depend on the driver, and can be
retrieved using the [`getLogTypes`](#getlogtypes) endpoint.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`type`|Type of log to retrieve|string|

#### Response

`GetLogEntry[]` - an array of log entries.

Typically a log entry is an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`level`|Level at which the message was logged|string|
|`message`|Contents of the actual log message|string|
|`timestamp`|Message timestamp (in milliseconds) in Unix format|number|

### getLogTypes

```
GET /session/:sessionId/se/log/types
```

Retrieves the available log types that can be used to call the [`getLog`](#getlog) endpoint.

#### Response

`string[]` - an array of log types

## Web Authentication Protocol

The [Web Authentication protocol](https://w3c.github.io/webauthn/) (WebAuthn) is an extension of
the W3C WebDriver protocol.

### addVirtualAuthenticator

```
POST /session/:sessionId/webauthn/authenticator
```

> WebAuthn documentation: [Add Virtual Authenticator](https://w3c.github.io/webauthn/#add-virtual-authenticator)

Creates a software [virtual authenticator](https://w3c.github.io/webauthn/#virtual-authenticators).

#### Parameters

|<div style="width:11em">Name</div>|Description|Type|Default|
|--|--|--|--|
|`isUserConsenting?`|Whether to always grant user consent|boolean|true|
|`isUserVerified?`|Whether to always succeed in user verification. Ignored if `hasUserVerification` is set to `false`.|boolean|false|
|`hasResidentKey?`|Whether client-side discoverable credentials are supported|boolean|false|
|`hasUserVerification?`|Whether user verification is supported|boolean|false|
|`protocol`|Protocol of this authenticator. Supported values are: `ctap1/u2f`, `ctap2`, or `ctap2_1`.|string||
|`transport`|Type of transport used to communicate with clients. Supported values are: `ble`, `hybrid`, `internal`, `nfc`, `smart-card`, or `usb`.|string||

#### Response

`string` - the ID of the created authenticator

### removeVirtualAuthenticator

```
DELETE /session/:sessionId/webauthn/authenticator/:authenticatorId
```

> WebAuthn documentation: [Remove Virtual Authenticator](https://w3c.github.io/webauthn/#remove-virtual-authenticator)

Removes the virtual authenticator identified by `:authenticatorId`.

#### Response

`null`

### addAuthCredential

```
POST /session/:sessionId/webauthn/authenticator/:authenticatorId/credential
```

> WebAuthn documentation: [Add Credential](https://w3c.github.io/webauthn/#add-credential)

Injects a [Public Key Credential Source](https://w3c.github.io/webauthn/#public-key-credential-source)
into the virtual authenticator identified by `:authenticatorId`.

#### Parameters

|<div style="width:11em">Name</div>|Description|Type|
|--|--|--|
|`credentialId`|Credential ID, in Base64url encoding|string|
|`isResidentCredential`|Whether to create a client-side discoverable credential. If set to `false`, a server-side credential is created instead.|boolean|
|`privateKey`|Asymmetric key package containing a single private key, in Base64url encoding|string|
|`rpId`|Relying Party ID the credential is scoped to|string|
|`signCount?`|Initial value for the signature counter. Set to `0` if omitted.|number|
|`userHandle?`|User handle associated with the credential, in Base64url encoding. Set to `null` if omitted.|string|

#### Response

`null`

### getAuthCredential

```
GET /session/:sessionId/webauthn/authenticator/:authenticatorId/credentials
```

> WebAuthn documentation: [Get Credentials](https://w3c.github.io/webauthn/#get-credentials)

Retrieves all Public Key Credential Sources stored in the virtual authenticator identified by
`:authenticatorId`.

#### Response

`Credential[]` - an array of credential objects. Each object has the following properties:

|<div style="width:11em">Name</div>|Description|Type|Default|
|--|--|--|--|
|`credentialId`|Credential ID, in Base64url encoding|string||
|`isResidentCredential`|Whether the credential is client-side discoverable (`true`) or server-side (`false`)|boolean||
|`largeBlob`|Large, per-credential blog, in Base64url encoding|string|`null`|
|`privateKey`|Asymmetric key package containing a single private key, in Base64url encoding|string||
|`rpId`|Relying Party ID the credential is scoped to|string||
|`signCount`|Initial value for the signature counter|number|`0`|
|`userHandle`|User handle associated with the credential, in Base64url encoding|string|`null`|

### removeAuthCredential

```
DELETE /session/:sessionId/webauthn/authenticator/:authenticatorId/credentials/:credentialId
```

> WebAuthn documentation: [Remove Credential](https://w3c.github.io/webauthn/#remove-credential)

Removes the Public Key Credential Source identified by `:credentialId` from the virtual authenticator
identified by `:authenticatorId`.

#### Response

`null`

### removeAllAuthCredentials

```
DELETE /session/:sessionId/webauthn/authenticator/:authenticatorId/credentials
```

> WebAuthn documentation: [Remove All Credentials](https://w3c.github.io/webauthn/#remove-all-credentials)

Removes all Public Key Credential Sources from the virtual authenticator identified by
`:authenticatorId`.

#### Response

`null`

### setUserAuthVerified

```
POST /session/:sessionId/webauthn/authenticator/:authenticatorId/uv
```

> WebAuthn documentation: [Set User Verified](https://w3c.github.io/webauthn/#set-user-verified)

Sets the `isUserVerified` property of the virtual authenticator identified by `:authenticatorId`.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`isUserVerified`|Whether to always succeed in user verification|boolean|

#### Response

`null`
