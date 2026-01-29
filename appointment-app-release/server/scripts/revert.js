const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.resolve(__dirname, '../');
const DB_PATH = path.join(SERVER_DIR, 'database.sqlite');

function log(message) {
    console.log(`[Revert] ${message}`);
}

try {
    log('Starting revert process...');

    // Find latest backup
    const files = fs.readdirSync(SERVER_DIR);
    const backups = files.filter(f => f.startsWith('database.sqlite.bak.'));

    if (backups.length === 0) {
        throw new Error('No backups found!');
    }

    // Sort by timestamp (part of filename)
    backups.sort();
    const latestBackup = backups[backups.length - 1]; // Last one is latest
    const backupPath = path.join(SERVER_DIR, latestBackup);

    log(`Restoring from ${latestBackup}...`);

    // Restore
    if (fs.existsSync(DB_PATH)) {
        // Backup current one just in case (as .corrupt or .pre-revert)
        fs.renameSync(DB_PATH, DB_PATH + '.pre-revert.' + Date.now());
    }

    fs.copyFileSync(backupPath, DB_PATH);

    log('Database restored successfully.');
    // Note: Code revert (git checkout) is complex to automate safely without knowing "what" to revert to.
    // Usually revert means "restore data" if migration failed.
    // The user can manually run `git checkout vX.X.X` if code is broken.
    // We will just restore DB for now.

} catch (error) {
    console.error('[Revert] Error:', error.message);
    process.exit(1);
}
