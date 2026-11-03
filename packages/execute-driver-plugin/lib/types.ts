export interface DriverScriptMessageEvent {
  driverOpts: any;
  script: string;
  timeoutMs: number;
}

export interface ScriptResultError {
  message: any;
  stack: any;
}

export interface ScriptResult {
  success?: RunScriptResult;
  error?: ScriptResultError;
}

export interface RunScriptResult {
  result: any;
  logs: {
    error: any[];
    warn: any[];
    log: any[];
  };
}
