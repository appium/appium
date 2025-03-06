# BiDi Commands Exported By The Storage Plugin

The storage plugin supports the below BiDi commands.

## appium:storage.upload

### CDDL

```cddl
appium:storage.upload = {
  method: "appium:storage.upload",
  params: {
    name: text,
    hash: text,
    size: int,
    chunk: text,
    position: int,
  },
}
```

## appium:storage.list

### CDDL

```cddl
appium:storage.list = {
  method: "appium:storage.list",
  params: {},
}
```

Returns list of items, where each list item looks like:

```cddl
{
  name: text,
  path: text,
  size: int,
}
```

## appium:storage.delete

### CDDL

```cddl
appium:storage.delete = {
  method: "appium:storage.delete",
  params: {
    name: text,
  },
}
```

## appium:storage.reset

### CDDL

```cddl
appium:storage.reset = {
  method: "appium:storage.reset",
  params: {},
}
```
