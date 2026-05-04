# Appium Startup Sequence
## 1) CLI entrypoint
- The `appium` executable is defined in `packages/appium/package.json` via `"bin": {"appium": "index.js"}`.
- `packages/appium/index.js` loads `./build/lib/main.js` and, when run directly, calls `appium.main()`.

## 2) Top-level orchestration (`main.ts`)
- `packages/appium/lib/main.ts` imports `logsink` and `logger` first (order matters for logging setup).
- It constructs `AppiumInitializer` and `AppiumMainRunner`.
- `main(args?)` does:
  1. `const initResult = await init(args)`
  2. `return mainRunner.run(initResult, args)`

## 3) Initialization phase (`AppiumInitializer.init`)
- Resolves Appium home directory and validates access.
- Loads extension configs (drivers/plugins).
- Parses CLI or programmatic args.
- Reads and validates config file.
- For server startup, merges CLI + config + defaults, initializes logging, creates `AppiumDriver`, and runs preflight checks.
- Early-exit paths in initializer: `showConfig` and `showDebugInfo` return without launching the HTTP server.
- For non-server commands (driver/plugin/setup subcommands), executes command flow and exits without starting HTTP listener.

## 4) AppiumMainRunner phase (`AppiumMainRunner.run`)
- Returns immediately if initialization produced an empty result (non-server command path).
- Loads active plugin classes, then active driver classes.
- Applies runtime setup:
  - `logStartupInfo(parsedArgs)`
  - `appiumDriver.configureGlobalFeatures()`
  - build server options with `buildServerOpts(...)`
- Calls `startHttpServer(serverOpts, appiumDriver, normalizedBasePath)`.
- If server creation fails in `startHttpServer`, Appium logs the error and exits with status code `1`.
- After server starts:
  - warns if `allowCors` is enabled,
  - optionally registers to Selenium Grid (`nodeconfig`),
  - installs `SIGINT`/`SIGTERM` graceful shutdown handlers,
  - logs final listener URL and prints active driver/plugin configuration.

## 5) HTTP server launch phase (`createAppiumServer`)
- `AppiumMainRunner.startHttpServer()` delegates to `createAppiumServer(...)` in `packages/appium/lib/bootstrap/main-helpers.ts`.
- `createAppiumServer(...)`:
  - creates a BiDi `WebSocketServer`,
  - calls `baseServer(serverOpts)` from `@appium/base-driver`,
  - registers BiDi websocket handlers on Appium routes.
- Inside `packages/base-driver/lib/express/server.ts`, `baseServer(...)`:
  - creates an Express app,
  - creates transport server with:
    - `http.createServer(app)` by default, or
    - `spdy.createServer(...)` when SSL cert/key are provided,
  - configures middleware/routes/upgrades/timeouts,
  - launches listener via `httpServer.listen(port, hostname)`.

## 6) End state
- The Appium HTTP(S) server is listening with REST routes mounted and BiDi websocket endpoints attached.
- Process signal handlers are active for graceful shutdown and cleanup.

## 7) Additional early-exit conditions
- During preflight, `--show-build-info` prints build metadata and exits before HTTP listener startup.
