const { sequelize, User } = require('../src/models');

async function checkExpertEmails() {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'displayName', 'email', 'isAdmin']
        });

        console.log('\n=== EXPERTEN E-MAIL ÜBERSICHT ===\n');

        users.forEach(user => {
            const emailStatus = user.email ? '✓' : '✗ FEHLT';
            console.log(`${emailStatus} ${user.displayName || user.username}`);
            console.log(`   E-Mail: ${user.email || 'KEINE E-MAIL GESETZT'}`);
            console.log(`   Admin: ${user.isAdmin ? 'Ja' : 'Nein'}`);
            console.log('');
        });

        const usersWithoutEmail = users.filter(u => !u.email);
        if (usersWithoutEmail.length > 0) {
            console.log(`⚠️  WARNUNG: ${usersWithoutEmail.length} Benutzer haben keine E-Mail-Adresse!`);
            console.log('Diese Benutzer werden NICHT über Terminbuchungen informiert.');
        } else {
            console.log('✓ Alle Benutzer haben E-Mail-Adressen konfiguriert.');
        }

    } catch (err) {
        console.error('Fehler:', err);
    } finally {
        await sequelize.close();
    }
}

checkExpertEmails();
