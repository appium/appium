/**
 * Resolves the name of extension method corresponding to an `execute` command string
 * based on the driver's `executeMethodMap`.
 *
 * @param driverInstance - The instance of the driver which may have a command mapping.
 * @param commandName - The command name to resolve.
 * @returns The resolved extension command name if a mapping exists. Otherwise, the original command name.
 */
export function resolveExecuteExtensionName(driverInstance: unknown, commandName: string): string {
  const DriverClass = Object.getPrototypeOf(driverInstance)?.constructor;
  const methodMap = (DriverClass as any)?.executeMethodMap;

  if (methodMap && typeof methodMap === 'object' && commandName in methodMap) {
    const command = methodMap[commandName]?.command;
    if (typeof command === 'string') {
      return command;
    }
  }

  return commandName;
}
