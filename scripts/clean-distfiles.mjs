import {globSync, rmSync} from 'node:fs';

const patterns = ['packages/*/build', 'packages/*/**/.tsconfig.tsbuildinfo'];
for (const pattern of patterns) {
  for (const match of globSync(pattern, {exclude: (p) => p.includes('node_modules')})) {
    rmSync(match, {recursive: true, force: true});
  }
}
