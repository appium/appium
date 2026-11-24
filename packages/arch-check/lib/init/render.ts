import {type DerivedComponent, toIdentifier} from './derive.js';

/** Renders `spec.c4` and `model.c4`. */
export function renderModel(
  packageName: string,
  components: readonly DerivedComponent[],
  edges: readonly string[],
): {spec: string; model: string} {
  const container = toIdentifier(packageName.replace(/^@/, '').replace(/\//g, '-'));
  const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const spec = `specification {
  element container
  element component
  // Tag a component #unenforced to document it without checking its dependencies.
  tag unenforced
}
`;
  const model = `// Architecture of ${packageName}, derived from the code by \`arch-check init\`.
// Each component owns the files in \`metadata.paths\`; each \`a -> b\` below ALLOWS a to import b.
// Delete the dependencies you do not want (arch-check then reports them), and add descriptions.
model {
  ${container} = container ${quote(packageName)} {
${components
  .map(
    (c) => `    ${c.id} = component ${quote(c.title)} {
      description 'TODO: describe the responsibility of ${c.title.replace(/'/g, '')}'
      metadata { paths ${quote(c.paths)} }
    }`,
  )
  .join('\n')}
  }

${edges
  .map((e) => {
    const [from, to] = e.split(' -> ');
    return `  ${container}.${from} -> ${container}.${to}`;
  })
  .join('\n')}
}
`;
  return {spec, model};
}
