---
title: Translating Appium Documentation
---

The process of Appium documents localization into languages other than English is automated and is done via
the [Crowdin Translations Management System](https://crowdin.com).

## Where To Start

If you would like to contribute to the translation of Appium documents into your language then simply join
the translators group for the [Appium Documentation](https://crowdin.com/project/appium-documentation)
Crowdin project, and start translating documents there. If you see that your language is missing from
the list of available Crowdin languages then simply let us know by creating an
[issue](https://github.com/appium/appium/issues).

## Source Language Updates

Changes in documents are synchronized to Crowdin automatically via the `Update Crowdin English Docs` GitHub action.
This action is triggered automatically as soon as there are any changes under `packages/appium/docs/en/**.md`.

## Fetching Translated Documents

In order to fetch translated files from Crowdin to the GitHub repository it is necessary to trigger
the `Sync Crowdin Docs Translations` action. This action should also automatically create a PR with
corresponding translated resources included.
