import {
  Context,
  Converter,
  ReflectionKind,
  Application,
  DeclarationReflection,
  ReflectionType,
  TypeOperatorType,
  TupleType,
  LiteralType,
} from 'typedoc';

/**
 * I don't think we allow other HTTP methods?
 */
type AllowedHttpMethod = 'GET' | 'POST' | 'DELETE';

/**
 * This is (going to be) an object that tracks known commands which we can cross-reference
 * with `@appiumCommand` tags.
 */
interface CommandRef {
  route: string;
  httpMethod: AllowedHttpMethod;
  command: string;
  requiredParams?: string[];
  optionalParams?: string[];
  name: string;
  /**
   * This is present if we're using `executeMethodMap`, since the `path`
   * will always be `/execute`.
   */
  script?: string;
}

const TAG_APPIUM_COMMAND = '@appiumCommand';
const TAG_APPIUM_PROXY_COMMAND = '@appiumProxyCommand';

const NAME_NEW_METHOD_MAP = 'newMethodMap';
const NAME_EXECUTE_METHOD_MAP = 'executeMethodMap';
const NAME_EXECUTE_ROUTE = '/session/:sessionId/execute';
const NAME_METHOD_MAP = 'METHOD_MAP';
const NAME_REQUIRED = 'required';
const NAME_OPTIONAL = 'optional';
const NAME_PARAMS = 'params';
const NAME_COMMAND = 'command';
const NAME_PAYLOAD_PARAMS = 'payloadParams';

function isDeclarationReflection(value: any): value is DeclarationReflection {
  return value instanceof DeclarationReflection;
}

function isReflectionType(value: any): value is ReflectionType {
  return value instanceof ReflectionType;
}

function isTypeOperatorType(value: any): value is TypeOperatorType {
  return value instanceof TypeOperatorType;
}

function isLiteralType(value: any): value is LiteralType {
  return value instanceof LiteralType;
}

function isTupleType(value: any): value is TupleType {
  return value instanceof TupleType;
}

function parseParams(prop: DeclarationReflection, name: string): string[] {
  const params = [];
  if (isReflectionType(prop.type)) {
    const requiredProp = prop.type.declaration.getChildByName(name);
    if (
      isDeclarationReflection(requiredProp) &&
      isTypeOperatorType(requiredProp.type) &&
      isTupleType(requiredProp.type.target)
    ) {
      for (const reqd of requiredProp.type.target.elements) {
        if (isLiteralType(reqd)) {
          params.push(String(reqd.value));
        }
      }
    }
  }
  return params;
}

function parseRequiredParams(prop: DeclarationReflection): string[] {
  return parseParams(prop, NAME_REQUIRED);
}

function parseOptionalParams(prop: DeclarationReflection): string[] {
  return parseParams(prop, NAME_OPTIONAL);
}

function parseExecuteMethodMap(cls: DeclarationReflection): Set<CommandRef> {
  const className = cls.originalName;
  const executeMethodMap = cls.getChildByName(NAME_EXECUTE_METHOD_MAP);
  const commandRefs = new Set<CommandRef>();
  if (
    executeMethodMap?.flags.isStatic &&
    isDeclarationReflection(executeMethodMap) &&
    isReflectionType(executeMethodMap.type)
  ) {
    for (const newMethodProp of executeMethodMap.type.declaration.getChildrenByKind(
      ReflectionKind.Property
    )) {
      const script = newMethodProp.originalName;
      if (isDeclarationReflection(newMethodProp) && isReflectionType(newMethodProp.type)) {
        const commandProp = newMethodProp.type.declaration.getChildByName(NAME_COMMAND);
        if (isDeclarationReflection(commandProp) && isLiteralType(commandProp.type)) {
          const command = String(commandProp.type.value);
          const paramsProp = newMethodProp.type.declaration.getChildByName(NAME_PARAMS);
          let requiredParams: string[] = [];
          let optionalParams: string[] = [];
          if (isDeclarationReflection(paramsProp)) {
            requiredParams = parseRequiredParams(paramsProp);
            optionalParams = parseOptionalParams(paramsProp);
          }
          commandRefs.add({
            command,
            name: className,
            requiredParams,
            optionalParams,
            httpMethod: 'POST', // these are always `POST`
            route: NAME_EXECUTE_ROUTE,
            script,
          });
        }
      }
    }
  }
  return commandRefs;
}

function parseMethodMap(cls: DeclarationReflection): Set<CommandRef> {
  const name = cls.originalName;
  const newMethodMap =
    cls.getChildByName(NAME_NEW_METHOD_MAP) ?? cls.getChildByName(NAME_METHOD_MAP);
  const commandRefs = new Set<CommandRef>();
  // these next two conditionals are split up due to the limitations
  // of TS's inference
  if (
    (cls.kindOf(ReflectionKind.Class) && newMethodMap?.flags.isStatic) ||
    !cls.kindOf(ReflectionKind.Class)
  ) {
    if (isDeclarationReflection(newMethodMap) && isReflectionType(newMethodMap.type)) {
      for (const newMethodProp of newMethodMap.type.declaration.getChildrenByKind(
        ReflectionKind.Property
      )) {
        const route = newMethodProp.originalName;
        if (isDeclarationReflection(newMethodProp) && isReflectionType(newMethodProp.type)) {
          for (const httpMethodProp of newMethodProp.type.declaration.getChildrenByKind(
            ReflectionKind.Property
          )) {
            const httpMethod = httpMethodProp.originalName as AllowedHttpMethod;
            if (isDeclarationReflection(httpMethodProp) && isReflectionType(httpMethodProp.type)) {
              const commandProp = httpMethodProp.type.declaration.getChildByName(NAME_COMMAND);
              if (isDeclarationReflection(commandProp) && isLiteralType(commandProp.type)) {
                const command = String(commandProp.type.value);
                const payloadParamsProp =
                  httpMethodProp.type.declaration.getChildByName(NAME_PAYLOAD_PARAMS);
                let requiredParams: string[] = [];
                let optionalParams: string[] = [];
                if (isDeclarationReflection(payloadParamsProp)) {
                  requiredParams = parseRequiredParams(payloadParamsProp);
                  optionalParams = parseOptionalParams(payloadParamsProp);
                }
                commandRefs.add({
                  command,
                  name: name,
                  requiredParams,
                  optionalParams,
                  httpMethod,
                  route,
                });
              }
            }
          }
        }
      }
    }
  }
  return commandRefs;
}

export function load(app: Application) {
  // app.options.addDeclaration({
  //   help: '[Appium Plugin] The name(s) of the extension classes',
  //   name: 'extensionClasses',
  //   type: ParameterType.Array,
  // validate: (value) => {
  //   if (!value) {
  //     throw new Error('The `extensionClasses` option must be set');
  //   }
  // },
  // });

  const newCommands: Map<number, Set<CommandRef>> = new Map();

  const nameToId: Map<string, number> = new Map();

  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (ctx: Context) => {
    const modules = ctx.project.getChildrenByKind(ReflectionKind.Module);
    for (const mod of modules) {
      const classes = mod.getChildrenByKind(ReflectionKind.Class);
      for (const cls of classes) {
        if (newCommands.has(cls.id)) {
          throw new ReferenceError(
            `Duplicate ID in "${cls.originalName}" (this should not happen): ${cls.id}`
          );
        }
        const executeMethodMap = parseExecuteMethodMap(cls);
        const newMethodMap = parseMethodMap(cls);
        const methodMaps = new Set([...executeMethodMap, ...newMethodMap]);
        if (methodMaps.size) {
          newCommands.set(cls.id, new Set([...executeMethodMap, ...newMethodMap]));
          nameToId.set(cls.originalName, cls.id);
        }
      }
    }

    const baseDriver = ctx.project.getChildByName('@appium/base-driver');
    if (isDeclarationReflection(baseDriver)) {
      const methodMap = parseMethodMap(baseDriver);
      if (methodMap.size) {
        if (newCommands.has(baseDriver.id)) {
          throw new ReferenceError(
            `Duplicate ID in "${baseDriver.originalName}" (this should not happen): ${baseDriver.id}`
          );
        }
        newCommands.set(baseDriver.id, methodMap);
        nameToId.set(baseDriver.originalName, baseDriver.id);
        console.dir(newCommands);
      }
    }
    process.exit();
  });
}
