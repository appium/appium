---
title: Automating Gestures
---

Appium supports automating complex pointer, touch, key, and wheel interactions through the
W3C WebDriver [Perform Actions](../reference/api/webdriver.md#performactions) API
([W3C Specification](https://w3c.github.io/webdriver/#actions)). Alternatively, many drivers provide
platform-native gesture [Execute Methods](./execute-methods.md) for common mobile interactions.

In the W3C Actions API, interactions are defined by creating one or more virtual input sources
(such as `pointer` with `pointerType: "touch"`, `key`, `wheel`, or `none`) and queuing a sequence
of synchronized ticks (`pointerMove`, `pointerDown`, `pointerUp`, `pause`). See the
[Selenium Actions API documentation](https://www.selenium.dev/documentation/webdriver/actions_api/)
for a general overview of input sources and tick synchronization.

Below are examples of common single-finger and multi-touch gestures implemented using the W3C
Actions API across client languages.

## Double Tap

Performs two quick touch taps at `(x, y)` with a short pause between them:

=== "JS (WebDriverIO)"

    ```js
    await driver
      .action('pointer', {parameters: {pointerType: 'touch'}})
      .move({x: 200, y: 300, duration: 0})
      .down()
      .up()
      .pause(100)
      .down()
      .up()
      .perform();
    ```

=== "Java"

    ```java
    PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
    Sequence doubleTap = new Sequence(finger, 1)
        .addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), 200, 300))
        .addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()))
        .addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()))
        .addAction(new Pause(finger, Duration.ofMillis(100)))
        .addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()))
        .addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
    driver.perform(Collections.singletonList(doubleTap));
    ```

=== "Python"

    ```py
    actions = ActionChains(driver)
    actions.w3c_actions = ActionBuilder(driver, mouse=PointerInput(interaction.POINTER_TOUCH, "finger"))
    actions.w3c_actions.pointer_action.move_to_location(200, 300)
    actions.w3c_actions.pointer_action.pointer_down()
    actions.w3c_actions.pointer_action.pointer_up()
    actions.w3c_actions.pointer_action.pause(0.1)
    actions.w3c_actions.pointer_action.pointer_down()
    actions.w3c_actions.pointer_action.pointer_up()
    actions.perform()
    ```

=== "Ruby"

    ```rb
    f1 = driver.action.add_pointer_input(:touch, 'finger')
    f1.create_pointer_move(duration: 0, x: 200, y: 300, origin: :viewport)
    f1.create_pointer_down(:left)
    f1.create_pointer_up(:left)
    f1.create_pause(0.1)
    f1.create_pointer_down(:left)
    f1.create_pointer_up(:left)
    driver.perform_actions([f1])
    ```

=== "C#"

    ```dotnet
    var finger = new PointerInputDevice(PointerKind.Touch, "finger");
    var doubleTap = new ActionSequence(finger, 0);
    doubleTap.AddAction(finger.CreatePointerMove(CoordinateOrigin.Viewport, 200, 300, TimeSpan.Zero));
    doubleTap.AddAction(finger.CreatePointerDown(MouseButton.Touch));
    doubleTap.AddAction(finger.CreatePointerUp(MouseButton.Touch));
    doubleTap.AddAction(finger.CreatePause(TimeSpan.FromMilliseconds(100)));
    doubleTap.AddAction(finger.CreatePointerDown(MouseButton.Touch));
    doubleTap.AddAction(finger.CreatePointerUp(MouseButton.Touch));
    driver.PerformActions(new List<ActionSequence> { doubleTap });
    ```

## Long Press

Presses and holds a touch pointer at `(x, y)` for 1000ms before releasing:

=== "JS (WebDriverIO)"

    ```js
    await driver
      .action('pointer', {parameters: {pointerType: 'touch'}})
      .move({x: 200, y: 300, duration: 0})
      .down()
      .pause(1000)
      .up()
      .perform();
    ```

=== "Java"

    ```java
    PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
    Sequence longPress = new Sequence(finger, 1)
        .addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), 200, 300))
        .addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()))
        .addAction(new Pause(finger, Duration.ofMillis(1000)))
        .addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
    driver.perform(Collections.singletonList(longPress));
    ```

=== "Python"

    ```py
    actions = ActionChains(driver)
    actions.w3c_actions = ActionBuilder(driver, mouse=PointerInput(interaction.POINTER_TOUCH, "finger"))
    actions.w3c_actions.pointer_action.move_to_location(200, 300)
    actions.w3c_actions.pointer_action.pointer_down()
    actions.w3c_actions.pointer_action.pause(1.0)
    actions.w3c_actions.pointer_action.pointer_up()
    actions.perform()
    ```

=== "Ruby"

    ```rb
    f1 = driver.action.add_pointer_input(:touch, 'finger')
    f1.create_pointer_move(duration: 0, x: 200, y: 300, origin: :viewport)
    f1.create_pointer_down(:left)
    f1.create_pause(1.0)
    f1.create_pointer_up(:left)
    driver.perform_actions([f1])
    ```

=== "C#"

    ```dotnet
    var finger = new PointerInputDevice(PointerKind.Touch, "finger");
    var longPress = new ActionSequence(finger, 0);
    longPress.AddAction(finger.CreatePointerMove(CoordinateOrigin.Viewport, 200, 300, TimeSpan.Zero));
    longPress.AddAction(finger.CreatePointerDown(MouseButton.Touch));
    longPress.AddAction(finger.CreatePause(TimeSpan.FromMilliseconds(1000)));
    longPress.AddAction(finger.CreatePointerUp(MouseButton.Touch));
    driver.PerformActions(new List<ActionSequence> { longPress });
    ```

## Drag and Drop / Swipe

Moves a touch pointer from `(200, 600)` to `(200, 200)` over 600ms:

=== "JS (WebDriverIO)"

    ```js
    await driver
      .action('pointer', {parameters: {pointerType: 'touch'}})
      .move({x: 200, y: 600, duration: 0})
      .down()
      .pause(100)
      .move({x: 200, y: 200, duration: 600})
      .up()
      .perform();
    ```

=== "Java"

    ```java
    PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
    Sequence dragAndDrop = new Sequence(finger, 1)
        .addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), 200, 600))
        .addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()))
        .addAction(new Pause(finger, Duration.ofMillis(100)))
        .addAction(finger.createPointerMove(Duration.ofMillis(600), PointerInput.Origin.viewport(), 200, 200))
        .addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
    driver.perform(Collections.singletonList(dragAndDrop));
    ```

=== "Python"

    ```py
    actions = ActionChains(driver)
    actions.w3c_actions = ActionBuilder(driver, mouse=PointerInput(interaction.POINTER_TOUCH, "finger"))
    actions.w3c_actions.pointer_action.move_to_location(200, 600)
    actions.w3c_actions.pointer_action.pointer_down()
    actions.w3c_actions.pointer_action.pause(0.1)
    actions.w3c_actions.pointer_action.move_to_location(200, 200)
    actions.w3c_actions.pointer_action.pointer_up()
    actions.perform()
    ```

=== "Ruby"

    ```rb
    f1 = driver.action.add_pointer_input(:touch, 'finger')
    f1.create_pointer_move(duration: 0, x: 200, y: 600, origin: :viewport)
    f1.create_pointer_down(:left)
    f1.create_pause(0.1)
    f1.create_pointer_move(duration: 0.6, x: 200, y: 200, origin: :viewport)
    f1.create_pointer_up(:left)
    driver.perform_actions([f1])
    ```

=== "C#"

    ```dotnet
    var finger = new PointerInputDevice(PointerKind.Touch, "finger");
    var dragAndDrop = new ActionSequence(finger, 0);
    dragAndDrop.AddAction(finger.CreatePointerMove(CoordinateOrigin.Viewport, 200, 600, TimeSpan.Zero));
    dragAndDrop.AddAction(finger.CreatePointerDown(MouseButton.Touch));
    dragAndDrop.AddAction(finger.CreatePause(TimeSpan.FromMilliseconds(100)));
    dragAndDrop.AddAction(finger.CreatePointerMove(CoordinateOrigin.Viewport, 200, 200, TimeSpan.FromMilliseconds(600)));
    dragAndDrop.AddAction(finger.CreatePointerUp(MouseButton.Touch));
    driver.PerformActions(new List<ActionSequence> { dragAndDrop });
    ```

## Pinch and Zoom (Multi-Touch)

Uses two concurrent `touch` pointer sequences (`finger1` and `finger2`) moving apart to zoom in (or toward each other to pinch):

=== "JS (WebDriverIO)"

    ```js
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: {pointerType: 'touch'},
        actions: [
          {type: 'pointerMove', duration: 0, x: 200, y: 400},
          {type: 'pointerDown', button: 0},
          {type: 'pause', duration: 100},
          {type: 'pointerMove', duration: 500, x: 200, y: 200},
          {type: 'pointerUp', button: 0},
        ],
      },
      {
        type: 'pointer',
        id: 'finger2',
        parameters: {pointerType: 'touch'},
        actions: [
          {type: 'pointerMove', duration: 0, x: 200, y: 450},
          {type: 'pointerDown', button: 0},
          {type: 'pause', duration: 100},
          {type: 'pointerMove', duration: 500, x: 200, y: 650},
          {type: 'pointerUp', button: 0},
        ],
      },
    ]);
    ```

=== "Java"

    ```java
    PointerInput finger1 = new PointerInput(PointerInput.Kind.TOUCH, "finger1");
    Sequence seq1 = new Sequence(finger1, 1)
        .addAction(finger1.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), 200, 400))
        .addAction(finger1.createPointerDown(PointerInput.MouseButton.LEFT.asArg()))
        .addAction(new Pause(finger1, Duration.ofMillis(100)))
        .addAction(finger1.createPointerMove(Duration.ofMillis(500), PointerInput.Origin.viewport(), 200, 200))
        .addAction(finger1.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));

    PointerInput finger2 = new PointerInput(PointerInput.Kind.TOUCH, "finger2");
    Sequence seq2 = new Sequence(finger2, 1)
        .addAction(finger2.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), 200, 450))
        .addAction(finger2.createPointerDown(PointerInput.MouseButton.LEFT.asArg()))
        .addAction(new Pause(finger2, Duration.ofMillis(100)))
        .addAction(finger2.createPointerMove(Duration.ofMillis(500), PointerInput.Origin.viewport(), 200, 650))
        .addAction(finger2.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));

    driver.perform(Arrays.asList(seq1, seq2));
    ```

=== "Python"

    ```py
    action_builder = ActionBuilder(driver)
    finger1 = action_builder.add_pointer_input(interaction.POINTER_TOUCH, "finger1")
    finger2 = action_builder.add_pointer_input(interaction.POINTER_TOUCH, "finger2")

    finger1.create_pointer_move(duration=0, x=200, y=400)
    finger1.create_pointer_down(button=MouseButton.LEFT)
    finger1.create_pause(0.1)
    finger1.create_pointer_move(duration=500, x=200, y=200)
    finger1.create_pointer_up(button=MouseButton.LEFT)

    finger2.create_pointer_move(duration=0, x=200, y=450)
    finger2.create_pointer_down(button=MouseButton.LEFT)
    finger2.create_pause(0.1)
    finger2.create_pointer_move(duration=500, x=200, y=650)
    finger2.create_pointer_up(button=MouseButton.LEFT)

    action_builder.perform()
    ```

=== "Ruby"

    ```rb
    f1 = driver.action.add_pointer_input(:touch, 'finger1')
    f1.create_pointer_move(duration: 0, x: 200, y: 400, origin: :viewport)
    f1.create_pointer_down(:left)
    f1.create_pause(0.1)
    f1.create_pointer_move(duration: 0.5, x: 200, y: 200, origin: :viewport)
    f1.create_pointer_up(:left)

    f2 = driver.action.add_pointer_input(:touch, 'finger2')
    f2.create_pointer_move(duration: 0, x: 200, y: 450, origin: :viewport)
    f2.create_pointer_down(:left)
    f2.create_pause(0.1)
    f2.create_pointer_move(duration: 0.5, x: 200, y: 650, origin: :viewport)
    f2.create_pointer_up(:left)

    driver.perform_actions([f1, f2])
    ```

=== "C#"

    ```dotnet
    var finger1 = new PointerInputDevice(PointerKind.Touch, "finger1");
    var seq1 = new ActionSequence(finger1, 0);
    seq1.AddAction(finger1.CreatePointerMove(CoordinateOrigin.Viewport, 200, 400, TimeSpan.Zero));
    seq1.AddAction(finger1.CreatePointerDown(MouseButton.Touch));
    seq1.AddAction(finger1.CreatePause(TimeSpan.FromMilliseconds(100)));
    seq1.AddAction(finger1.CreatePointerMove(CoordinateOrigin.Viewport, 200, 200, TimeSpan.FromMilliseconds(500)));
    seq1.AddAction(finger1.CreatePointerUp(MouseButton.Touch));

    var finger2 = new PointerInputDevice(PointerKind.Touch, "finger2");
    var seq2 = new ActionSequence(finger2, 0);
    seq2.AddAction(finger2.CreatePointerMove(CoordinateOrigin.Viewport, 200, 450, TimeSpan.Zero));
    seq2.AddAction(finger2.CreatePointerDown(MouseButton.Touch));
    seq2.AddAction(finger2.CreatePause(TimeSpan.FromMilliseconds(100)));
    seq2.AddAction(finger2.CreatePointerMove(CoordinateOrigin.Viewport, 200, 650, TimeSpan.FromMilliseconds(500)));
    seq2.AddAction(finger2.CreatePointerUp(MouseButton.Touch));

    driver.PerformActions(new List<ActionSequence> { seq1, seq2 });
    ```

