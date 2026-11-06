const { execFileSync } = require('child_process');

// npm may rewrite tracked lockfiles. Preserve those changes before updating,
// without stashing source edits, configuration, uploads or database files.
function pullWithLockfileBackup(rootDir, log) {
    const git = args => execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' });
    const lockfiles = ['package-lock.json', 'client/package-lock.json', 'server/package-lock.json'];
    const changed = git(['diff', '--name-only', 'HEAD', '--', ...lockfiles]).trim();
    if (changed) {
        log('Backing up locally modified lockfiles in a Git stash: ' + changed.split('\n').join(', '));
        log(git(['stash', 'push', '-m', `Updater lockfile backup ${new Date().toISOString()}`, '--', ...lockfiles]));
        log('Lockfile backup retained as Git stash commit ' + git(['rev-parse', 'refs/stash']).trim());
    }
    // Divergent histories must be resolved manually; never create an implicit merge.
    return git(['pull', '--ff-only', 'origin', 'main']);
}

module.exports = { pullWithLockfileBackup };
