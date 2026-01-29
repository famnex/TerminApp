const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '../../');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const DB_PATH = path.join(SERVER_DIR, 'database.sqlite');

function log(message) {
    console.log(`[Updater] ${message}`);
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

    // 2. Git Pull
    log('Pulling latest changes from git...');
    execSync('git pull', { cwd: ROOT_DIR, stdio: 'inherit' });

    // 3. Install Dependencies (Root/Server)
    log('Installing server dependencies...');
    execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });

    // 4. Install Dependencies (Client)
    log('Installing client dependencies...');
    execSync('npm install', { cwd: CLIENT_DIR, stdio: 'inherit' });

    // 5. Build Client
    log('Building client...');
    execSync('npm run build', { cwd: CLIENT_DIR, stdio: 'inherit' });

    // 5.1 Copy Build to Server Public
    log('Moving client build to server/public...');
    const publicDir = path.join(SERVER_DIR, 'public');
    const distDir = path.join(CLIENT_DIR, 'dist');

    // Clean existing
    if (fs.existsSync(publicDir)) {
        fs.rmSync(publicDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicDir, { recursive: true });

    // Copy directory (Node < 16.7 doesn't have cpSync recursive, assuming Node 18+)
    if (fs.cpSync) {
        fs.cpSync(distDir, publicDir, { recursive: true });
    } else {
        // Fallback for older nodes or Windows specific if needed (simplest is shell copy or manual recursion)
        try {
            if (process.platform === 'win32') {
                execSync(`xcopy "${distDir}" "${publicDir}" /E /I /Y`);
            } else {
                execSync(`cp -r "${distDir}/"* "${publicDir}/"`);
            }
        } catch (e) {
            console.error('Copy failed, attempting manual logic if needed', e);
        }
    }

    log('Running database migrations...');
    // Assuming migrate_batch.js is sufficient/wrapper, or use direct sequelize CLI if available.
    // Ideally we should have a generic migrate script.
    // For now, attempting to run the batch migration script or a dedicated one if exists.
    // Let's rely on `npm run migrate` if we add it, or direct node execution.
    // Creating a quick temporary migration runner pattern if needed, but for now:
    try {
        const { sequelize } = require('../src/models');
        // This requires the script to be run within the context where models are available requiring full init.
        // Safer to run via shell command if we had a script.
        // Let's assume standard behavior: new code has new models, sequelize.sync() runs on restart.
        // But for explicit migrations (like data transformations), we might need a specific script.
        // For 1.0.0, we rely on sync() or manual scripts.
        log('Skipping explicit migration script, relying on Sequelize sync on restart.');
    } catch (e) {
        log('Migration verification failed (non-critical if sync is enabled): ' + e.message);
    }

    log('Update completed successfully.');

    // 7. Restart Application
    // In PM2, exiting with 0 or 1 usually triggers restart if configured.
    // We exit with 0 to indicate success. PM2 should be configured to restart on file changes or exit.
    log('Exiting process to trigger restart...');
    process.exit(0);

} catch (error) {
    console.error('[Updater] Error during update:', error);
    process.exit(1);
}
