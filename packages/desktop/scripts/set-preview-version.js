const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const originalVersion = pkg.version;
const runNumber = process.env.GITHUB_RUN_NUMBER || '1';
const previewVersion = `${originalVersion}-preview.${runNumber}`;

try {
  pkg.version = previewVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  execSync('electron-builder', { stdio: 'inherit' });
} finally {
  pkg.version = originalVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
}
