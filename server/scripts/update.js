const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '../../');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const DB_PATH = path.join(SERVER_DIR, 'database.sqlite');
const LOG_FILE = path.join(SERVER_DIR, 'update.log');

// Clear log file on start
fs.writeFileSync(LOG_FILE, '');

function log(message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [Updater] ${message}\n`;
    console.log(line.trim());
    fs.appendFileSync(LOG_FILE, line);
}

function backupDatabase() {
    if (fs.existsSync(DB_PATH)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${DB_PATH}.bak.${timestamp}`;
        fs.copyFileSync(DB_PATH, backupPath);
        log(`Database backed up to ${backupPath}`);
        return backupPath;
    }
    return null;
}

try {
    log('Starting update process...');

    // 1. Backup Database
    backupDatabase();

    // 2. Git Check & Pull
    const gitDir = path.join(ROOT_DIR, '.git');
    const REPO_URL = 'https://github.com/famnex/TerminApp.git';

    if (!fs.existsSync(gitDir)) {
        log('No .git directory found. Initializing git repository for updates...');

        // SAFETY: Add critical files to .gitignore if not present to prevent overwrite/delete
        const gitIgnorePath = path.join(ROOT_DIR, '.gitignore');
        let gitIgnoreContent = '';
        if (fs.existsSync(gitIgnorePath)) {
            gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
        }

        const criticalIgnores = [
            'server/database.sqlite',
            'server/public/uploads',
            '.env',
            'update.log'
        ];

        let appended = false;
        criticalIgnores.forEach(item => {
            if (!gitIgnoreContent.includes(item)) {
                gitIgnoreContent += `\n${item}`;
                appended = true;
            }
        });

        if (appended) {
            fs.writeFileSync(gitIgnorePath, gitIgnoreContent);
            log('Added local data files to .gitignore for safety.');
        }

        try {
            execSync('git init', { cwd: ROOT_DIR });
            execSync(`git remote add origin ${REPO_URL}`, { cwd: ROOT_DIR });
            log('Git repository initialized.');

            log('Fetching history...');
            execSync('git fetch --all', { cwd: ROOT_DIR, encoding: 'utf8' });

            log('Resetting to latest version...');
            // This is dangerous if files are not ignored, but we patched .gitignore above.
            // git reset --hard will only touch tracked files. 
            // Since we just inited, nothing is tracked locally yet, so it should be fine mostly.
            // But if a file exists locally AND in remote, it will be overwritten.
            // This is desired for code, undesired for data. 
            // Data files (db, uploads) are NOT in remote, so they are safe.
            execSync('git reset --hard origin/main', { cwd: ROOT_DIR, encoding: 'utf8' });
            log('Repository integrated successfully.');

        } catch (e) {
            log('Git Init/Sync Error: ' + e.message);
            throw e;
        }

    } else {
        log('Pulling latest changes from git...');
        // Redirect stdio to log file is tricky with execSync, so we capture output
        try {
            const output = execSync('git pull', { cwd: ROOT_DIR, encoding: 'utf8' });
            log(output);
        } catch (e) {
            log('Git Pull Error: ' + e.message);
            log(e.stdout);
            log(e.stderr);
            throw e;
        }
    }

    // 3. Install Dependencies (Root/Server)
    log('Installing server dependencies...');
    try {
        const output = execSync('npm install', { cwd: ROOT_DIR, encoding: 'utf8' });
        log(output);
    } catch (e) {
        log('NPM Install Error: ' + e.message);
        throw e;
    }

    // 4. Install Dependencies (Client)
    log('Installing client dependencies...');
    try {
        const output = execSync('npm install', { cwd: CLIENT_DIR, encoding: 'utf8' });
        log(output);
    } catch (e) {
        log('Client NPM Install Error: ' + e.message);
        throw e;
    }

    // 5. Build Client
    log('Building client...');
    try {
        const output = execSync('npm run build', { cwd: CLIENT_DIR, encoding: 'utf8' });
        log(output);
    } catch (e) {
        log('Client Build Error: ' + e.message);
        throw e;
    }

    // 5.1 Copy Build to Server Public
    log('Moving client build to server/public...');
    const publicDir = path.join(SERVER_DIR, 'public');
    const distDir = path.join(CLIENT_DIR, 'dist');

    // Clean existing
    if (fs.existsSync(publicDir)) {
        fs.rmSync(publicDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicDir, { recursive: true });

    // Copy directory
    if (fs.cpSync) {
        fs.cpSync(distDir, publicDir, { recursive: true });
    } else {
        try {
            if (process.platform === 'win32') {
                execSync(`xcopy "${distDir}" "${publicDir}" /E /I /Y`);
            } else {
                execSync(`cp -r "${distDir}/"* "${publicDir}/"`);
            }
        } catch (e) {
            log('Copy failed: ' + e.message);
        }
    }

    log('Running database migrations...');
    try {
        const { sequelize } = require('../src/models');
        log('Skipping explicit migration script, relying on Sequelize sync on restart.');
    } catch (e) {
        log('Migration verification failed (non-critical if sync is enabled): ' + e.message);
    }

    log('Update completed successfully.');
    log('Exiting process to trigger restart...');
    process.exit(0);

} catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    process.exit(1);
}
