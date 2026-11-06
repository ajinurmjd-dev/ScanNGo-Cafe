const { execSync } = require('child_process');
const path = require('path');

const tscPath = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');
const projectPath = path.join(__dirname, 'tsconfig.json');

try {
  console.log('Running TypeScript type check...');
  execSync(`${tscPath} --project ${projectPath} --noEmit`, { stdio: 'inherit', windowsHide: true });
  console.log('\nTypeScript check passed!');
  process.exit(0);
} catch (error) {
  console.error('\nTypeScript check failed!');
  process.exit(1);
}
