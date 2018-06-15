# PHP Sample Code

## Setup

* Install [composer](https://getcomposer.org/)
* Run `composer install` from this directory

## Running Tests

* vendor/phpunit/phpunit/phpunit <path_to_tests> (e.g.: `vendor/phpunit/phpunit/phpunit test/basic/AndroidBasicInteractions.php`)

## Troubleshooting

* ```Original error: '11.1' does not exist in the list of simctl SDKs. Only the following Simulator SDK versions are available on your system: x.y```
  * By default, these example tests expect IOS version 11.1
  * If 11.1 isn't available on your system, set the version by setting environment variable `IOS_PLATFORM_VERSION` or install with Xcode
