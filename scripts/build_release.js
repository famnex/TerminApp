const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('Development Release Builder');
console.log('===========================');

// 1. Clean Dist
if (fs.existsSync(distDir)) {
    console.log('Cleaning dist directory...');
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// 2. Build Client
console.log('Building Client...');
execSync('npm run build', { cwd: path.join(rootDir, 'client'), stdio: 'inherit' });

// 3. Prepare Server
console.log('Copying Server Files...');
const serverDest = path.join(distDir, 'server');
// Copy specific files/folders
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Ignore node_modules
fs.mkdirSync(serverDest);
const entries = fs.readdirSync(path.join(rootDir, 'server'));
for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === '.env' || entry.includes('database.sqlite') || entry.includes('database.db')) continue;
    copyRecursiveSync(path.join(rootDir, 'server', entry), path.join(serverDest, entry));
}
console.log('Server files copied (including scripts).');

// 4. Move Client Build to Server Public
console.log('Integrating Client Build...');
const clientBuildDir = path.join(rootDir, 'client', 'dist');
const serverPublicDir = path.join(serverDest, 'public');

// Use copy instead of rename to avoid EPERM/Cross-device issues
if (fs.existsSync(serverPublicDir)) {
    fs.rmSync(serverPublicDir, { recursive: true, force: true });
}
fs.mkdirSync(serverPublicDir, { recursive: true });

copyRecursiveSync(clientBuildDir, serverPublicDir);
console.log('Client build integrated.');

// 5. Create ZIP
console.log('Creating ZIP archive...');
const output = fs.createWriteStream(path.join(rootDir, 'appointment-app-release.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function () {
    console.log(archive.pointer() + ' total bytes');
    console.log('Release ZIP created successfully: appointment-app-release.zip');
});

archive.on('error', function (err) {
    throw err;
});

archive.pipe(output);
archive.directory(distDir, false);
archive.finalize();
