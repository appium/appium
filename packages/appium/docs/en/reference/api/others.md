---
title: Other Protocols
---
<style>
  ul[data-md-component="toc"] .md-nav .md-nav {
    display: none;
  }
</style>

The following is a list of endpoints supported in Appium that are defined in other protocols.

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

## Compute Pressure Protocol

The [Compute Pressure protocol](https://www.w3.org/TR/compute-pressure/) is an extension of the W3C
WebDriver protocol.

### createVirtualPressureSource

```
POST /session/:sessionId/pressuresource
```

> Compute Pressure documentation: [Create Virtual Pressure Source](https://www.w3.org/TR/compute-pressure/#create-virtual-pressure-source)

Creates a new virtual pressure source.

#### Parameters

|<div style="width:6em">Name</div>|Description|Type|Default|
|--|--|--|--|
|`type`|Type of pressure source to create|string||
|`supported?`|Whether the pressure source should be configured as supported|boolean|`true`|

#### Response

`null`

### updateVirtualPressureSource

```
POST /session/:sessionId/pressuresource/:pressureSourceType
```

> Compute Pressure documentation: [Update Virtual Pressure Source](https://www.w3.org/TR/compute-pressure/#update-virtual-pressure-source)

Updates the state of a virtual pressure source with the type identified by `:pressureSourceType`.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`sample`|Pressure state. Supported values are `nominal`, `fair`, `serious`, or `critical`.|string|

#### Response

`null`

### deleteVirtualPressureSource

```
DELETE /session/:sessionId/pressuresource/:pressureSourceType
```

> Compute Pressure documentation: [Delete Virtual Pressure Source](https://www.w3.org/TR/compute-pressure/#delete-virtual-pressure-source)

Deletes the virtual pressure source with the type identified by `:pressureSourceType`.

#### Response

`null`

## Custom Handlers Protocol

The [Custom Handlers protocol](https://html.spec.whatwg.org/multipage/system-state.html#user-agent-automation)
is an extension of the W3C WebDriver protocol, defined by the HTML Standard specification.

### setRPHRegistrationMode

```
POST /session/:sessionId/custom-handlers/set-mode
```

> Custom Handlers documentation: [Set RPH Registration Mode](https://html.spec.whatwg.org/multipage/system-state.html#user-agent-automation)

Sets the protocol handler automation mode, for processing registrations of custom protocol handlers.
By default, this mode is set to `none`.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`mode`|Automation mode to set. Supported values are `autoAccept`, `autoReject`, or `none`.|string|

#### Response

`null`

## Device Posture Protocol

The [Device Posture protocol](https://www.w3.org/TR/device-posture/) is an extension of the W3C
WebDriver protocol.

### setDevicePosture

```
POST /session/:sessionId/deviceposture
```

> Device Posture documentation: [Set Device Posture](https://www.w3.org/TR/device-posture/#set-device-posture)

Sets the device posture, overriding the posture set by the device hardware.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`posture`|Posture to which the device should be set. Supported values are `continuous` or `folded`.|string|

#### Response

`null`

### clearDevicePosture

```
DELETE /session/:sessionId/deviceposture
```

> Device Posture documentation: [Clear Device Posture](https://www.w3.org/TR/device-posture/#clear-device-posture)

Clears the previously set device posture, returning posture control back to the device hardware.

#### Response

`null`

## Federated Credential Management Protocol

The [Federated Credential Management protocol](https://www.w3.org/TR/fedcm-1) (FedCM) is an
extension of the W3C WebDriver protocol. Clients can enable this protocol by using the
[`fedcm:accounts`](https://www.w3.org/TR/fedcm-1/#webdriver-capability) capability.

### fedCMCancelDialog

```
POST /session/:sessionId/fedcm/canceldialog
```

> FedCM documentation: [Cancel Dialog](https://www.w3.org/TR/fedcm-1/#webdriver-canceldialog)

Cancels the currently open FedCM dialog.

#### Response

`null`

### fedCMSelectAccount

```
POST /session/:sessionId/fedcm/selectaccount
```

> FedCM documentation: [Select Account](https://www.w3.org/TR/fedcm-1/#webdriver-selectaccount)

Selects an account to use for the currently open FedCM dialog.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`accountIndex`|Index of the account in the list of available accounts|number|

#### Response

`null`

### fedCMClickDialogButton

```
POST /session/:sessionId/fedcm/clickdialogbutton
```

> FedCM documentation: [Click Dialog Button](https://www.w3.org/TR/fedcm-1/#webdriver-clickdialogbutton)

Clicks a button in the currently open FedCM dialog.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`dialogButton`|Identifier of the button to click. Must be set to `ConfirmIdpLoginContinue`.|string|

#### Response

`null`

### fedCMGetAccounts

```
GET /session/:sessionId/fedcm/accountlist
```

> FedCM documentation: [Account List](https://www.w3.org/TR/fedcm-1/#webdriver-accountlist)

Retrieves all accounts that the user can select in the currently open FedCM dialog.

#### Response

`FedCMAccount[]` - an array of objects, where each object includes the following properties:

|<div style="width:10em">Name</div>|Description|Type|
|--|--|--|
|`accountId`|Account ID|string|
|`email`|Account email|string|
|`name`|Account name|string|
|`givenName?`|Account given name|string|
|`pictureUrl?`|Account picture URL|string|
|`idpConfigUrl`|URL of the identity provider configuration file|string|
|`loginState`|Login state. Set to `SignUp` if the account is not connected, otherwise `SignIn`.|string|
|`termsOfServiceUrl?`|Terms of Service URL of the website, if `loginState` is set to `SignUp`|string|
|`privacyPolicyUrl?`|Privacy Policy URL of the website, if `loginState` is set to `SignUp`|string|

### fedCMGetTitle

```
GET /session/:sessionId/fedcm/gettitle
```

> FedCM documentation: [Get Title](https://www.w3.org/TR/fedcm-1/#webdriver-gettitle)

Retrieves the title and subtitle (if one exists) of the currently open FedCM dialog.

#### Response

`FedCMDialogTitle` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`title`|Dialog title|string|
|`subtitle?`|Dialog subtitle|string|

### fedCMGetDialogType

```
GET /session/:sessionId/fedcm/getdialogtype
```

> FedCM documentation: [Get Dialog Type](https://www.w3.org/TR/fedcm-1/#webdriver-getdialogtype)

Retrieves the type of the currently open FedCM dialog.

#### Response

`string` - can be set to `AutoReauthn`, `AccountChooser`, or `ConfirmIdpLogin`

### fedCMSetDelayEnabled

```
POST /session/:sessionId/fedcm/setdelayenabled
```

> FedCM documentation: [Set Delay Enabled](https://www.w3.org/TR/fedcm-1/#webdriver-setdelayenabled)

Sets the state of the promise rejection delay, which is used to prevent information leakage about
the logged in state of the user.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`enabled`|Whether to enable the promise rejection delay|boolean|

#### Response

`null`

### fedCMResetCooldown

```
POST /session/:sessionId/fedcm/resetcooldown
```

> FedCM documentation: [Reset Cooldown](https://www.w3.org/TR/fedcm-1/#webdriver-resetcooldown)

Resets the cooldown delay used after dismissing a FedCM dialog.

#### Response

`null`

## Generic Sensor Protocol

The [Generic Sensor protocol](https://www.w3.org/TR/generic-sensor/) is an extension of the W3C
WebDriver protocol.

### createVirtualSensor

```
POST /session/:sessionId/sensor
```

> Generic Sensor documentation: [Create Virtual Sensor](https://www.w3.org/TR/generic-sensor/#create-virtual-sensor-command)

Creates a new virtual sensor.

#### Parameters

|<div style="width:12em">Name</div>|Description|Type|Default|
|--|--|--|--|
|`type`|Type of sensor to create|string||
|`connected?`|Whether the sensor should be configured as connected|boolean|`true`|
|`maxSamplingFrequency?`|Maximum sensor sampling frequency|number||
|`minSamplingFrequency?`|Minimum sensor sampling frequency|number||

#### Response

`null`

### getVirtualSensorInfo

```
GET /session/:sessionId/sensor/:sensorType
```

> Generic Sensor documentation: [Get Virtual Sensor Information](https://www.w3.org/TR/generic-sensor/#get-virtual-sensor-information-command)

Retrieves information about the virtual sensor with the type identified by `:sensorType`.

#### Response

`GetVirtualSensorInfoResponse` - an object containing the `requestedSamplingFrequency` key, whose
value is the requested sampling frequency of the sensor type

### updateVirtualSensorReading

```
POST /session/:sessionId/sensor/:sensorType
```

> Generic Sensor documentation: [Update Virtual Sensor Reading](https://www.w3.org/TR/generic-sensor/#update-virtual-sensor-reading-command)

Updates the virtual sensor with the type identified by `:sensorType` with a new reading.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`reading`|Object containing reading properties specific to the sensor type|object|

#### Response

`null`

### deleteVirtualSensor

```
DELETE /session/:sessionId/sensor/:sensorType
```

> Generic Sensor documentation: [Delete Virtual Sensor](https://www.w3.org/TR/generic-sensor/#delete-virtual-sensor-command)

Deletes the virtual sensor with the type identified by `:sensorType`.

#### Response

`null`

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

## Secure Payment Confirmation Protocol

The [Secure Payment Confirmation protocol](https://www.w3.org/TR/secure-payment-confirmation) (SPC)
is an extension of the W3C WebDriver protocol.

### setSPCTransactionMode

```
POST /session/:sessionId/secure-payment-confirmation/set-mode
```

> SPC documentation: [Set SPC Transaction Mode](https://www.w3.org/TR/secure-payment-confirmation/#sctn-automation-set-spc-transaction-mode)

Sets the transaction automation mode, for automated handling of transaction confirmation prompts.
By default, this mode is set to `none`.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`mode`|Automation mode to set. Supported values are `autoAccept`, `autoChooseToAuthAnotherWay`, `autoReject`, or `autoOptOut`.|string|

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
the W3C WebDriver protocol. Clients can enable this protocol by using the
[`webauthn:virtualAuthenticators`](https://w3c.github.io/webauthn/#sctn-automation-webdriver-capability)
capability.

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
