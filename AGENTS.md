# Repository guidance

Follow the [contributor style guide](packages/appium/docs/en/contributing/index.md#code-style).

## Class member ordering

- Order methods by visibility: public → protected → private. Methods without an explicit visibility
  modifier belong to the public group.
- Place private helper methods at the end of the class.
- Preserve existing order within each visibility group.
- Before finishing, check the ordering of methods you added or moved.
