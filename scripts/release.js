const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PACKAGES = [
    path.join(__dirname, 'package.json'),
    path.join(__dirname, 'client/package.json'),
    path.join(__dirname, 'server/package.json')
];

function getCurrentVersion() {
    const pkg = JSON.parse(fs.readFileSync(PACKAGES[0], 'utf8'));
    return pkg.version;
}

function updateVersion(version) {
    PACKAGES.forEach(pkgPath => {
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            pkg.version = version;
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n'); // Maintain formatting
            console.log(`Updated ${path.relative(process.cwd(), pkgPath)} to ${version}`);
        }
    });
}

const currentVersion = getCurrentVersion();
console.log(`Current version: ${currentVersion}`);

rl.question('Select version bump: [1] Major, [2] Minor, [3] Patch, [4] Custom: ', (answer) => {
    let [major, minor, patch] = currentVersion.split('.').map(Number);
    let newVersion = '';

    switch (answer.trim()) {
        case '1':
            major++;
            minor = 0;
            patch = 0;
            newVersion = `${major}.${minor}.${patch}`;
            break;
        case '2':
            minor++;
            patch = 0;
            newVersion = `${major}.${minor}.${patch}`;
            break;
        case '3':
            patch++;
            newVersion = `${major}.${minor}.${patch}`;
            break;
        case '4':
            rl.question('Enter custom version: ', (custom) => {
                confirmAndRelease(custom.trim());
            });
            return; // Wait for callback
        default:
            console.log('Invalid selection');
            rl.close();
            return;
    }

    confirmAndRelease(newVersion);
});

function confirmAndRelease(version) {
    console.log(`\nPreparing to release version: v${version}`);
    rl.question('Proceed? (y/N): ', (confirm) => {
        if (confirm.toLowerCase() !== 'y') {
            console.log('Aborted.');
            rl.close();
            return;
        }

        try {
            updateVersion(version);

            console.log('\nStaging files...');
            execSync('git add .');

            console.log('Committing...');
            execSync(`git commit -m "chore: release v${version}"`);

            console.log('Tagging...');
            execSync(`git tag v${version}`);

            console.log('Pushing to remote...');
            execSync('git push && git push --tags');

            console.log(`\nSuccessfully released v${version}! 🚀`);
        } catch (error) {
            console.error('\nError during release process:', error.message);
        } finally {
            rl.close();
        }
    });
}
