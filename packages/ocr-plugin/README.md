# Appium Optical Character Recognition (OCR) Plugin

This is an official Appium plugin designed to simplify text recognition on automated screenshots and other images.
The plugin is based on [tesseract.js](https://github.com/naptha/tesseract.js) library.

## Features

The plugin adds a new server API call:

`POST /session/:sessionId/appium/perform_ocr`

### Arguments

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
image | string | yes | Base-64 encoded image payload. Check [Image Format](https://github.com/naptha/tesseract.js/blob/1ebde35b3b52f2f5643b6442c624542011f75395/docs/image-format.md) document for more details about supported image formats. | iVBORw0KGgoAAAAN…
options | map | no | Optical recognition options. See below for more details on available options. | {verbose: true}

#### Options

Name | Type | Required | Description | Example
--- | --- | --- | --- | ---
languages | string | no | One or more "+"-separated language names to recognize on the given image. Make sure you have downloaded the corresponding .traineddata.gz (these are smaller, but need to be extracted afterwards, plus the parent folder must be writeable) or .traineddata (these are bigger, but don't need any further manipulations neither the parent folder to be writeable) file for each language going to be recognized (only `eng` one is present by default). The plugin looks for language .traineddata.gz or .traineddata files under `langsRoot` folder. Language names should correspond to existing file names. | 'eng+fra'
imagesRoot | string | no | The full path to the folder where temporary images are supposed to be stored. The folder must be writeable. Equals to `<plugin_root>/images` by default. | /tmp/images
langsRoot | string | no | The full path to the folder where .traineddata or .traineddata.gz files are located. Files for various languages could be downloaded from [tessdata GitHub project](https://github.com/naptha/tessdata)
rectangle | map | no | If provided then OCR is only going to be applied to this particular area of the provided image. | {left: 0, top: 0, width: 100, height: 100}
parameters | map | no | Various parameters for Tesseract API. Check the documentation for [Worker.setParameters](https://github.com/naptha/tesseract.js/blob/master/docs/api.md#worker-set-parameters) API for more details. | {user_defined_dpi: 300}
oem | number | no | OCR Engine Mode. Check the [documentation page](https://github.com/naptha/tesseract.js/blob/master/docs/api.md#oem) for more details | 1
verbose | boolean | no | Whether to append verbose tesseract.js logs into plugin logs. Disabled by default. | true

### Returns

The API returns a map with a single `page` entry. The entry contains the following attributes:

Name | Type | Description
--- | --- | ---
page | map | This map contains various entries. Check tesseract.js's [Page type definitions](https://github.com/naptha/tesseract.js/blob/master/src/index.d.ts) for more details on available items. The most important is the `text` one, which is a string containing the recognized text. It could equal to an empty string if no text has been recognized.

## Prerequisites

* Appium Server 2.0+

## Installation - Server

Install the plugin using Appium's plugin CLI:

```
appium plugin install ocr
```

## Installation - Client

No special action is needed to make the features available in the various Appium clients,
as this plugin used to be a core Appium feature and its commands are already supported in the official clients.

## Activation

The plugin will not be active unless turned on when invoking the Appium server:

```
appium --use-plugins=ocr
```

## Troubleshooting

### Slow Performance

The OCR performance depends on multiple factors. In general this is not a fast, but rather quite CPU-intensive operation. Sometimes we may talk about seconds or tens of seconds in case of a large/complicated input data. The actual recognition performance could be tuned by changing the following values:

- Decide on which .traineddata file should be selected for the given language. [tessdata page](https://github.com/naptha/tessdata) contains samples optimized either for high-quality or high-speed recognition. By default, the plugin is supplied with the high-speed one for English.
- Consider keeping extracted .traineddata files in the `langsRoot` folder. They must be extracted anyway before they could be used, so keeping them without archiving saves some time during the script run.
- Try to minimize the amount of the incoming data. Downscale the input image, decrease its DPI, cut off regions without text if possible. You could also use the `rectangle` option in order to limit the actual recognition area on the provided image.

The list above is not full, and tesseract.js contains, of course, many more options that influence the performance. We have just enumerated the most obvious ones.

### TypeError: Failed to parse URL

There is known [issue](https://github.com/naptha/tesseract.js/issues/702) about tesseract.js
interoperability with Node.js 18+. For now the only workaround is to use Node.js version below 18.
