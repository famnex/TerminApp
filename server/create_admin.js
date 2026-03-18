const { User } = require('./src/models');
const sequelize = require('./src/config/database');

async function createAdmin() {
    try {
        await sequelize.sync();

        const adminExists = await User.findOne({ where: { username: 'admin' } });
        const bcrypt = require('bcrypt'); // Wir benötigen bcrypt für das manuelle Hashen beim Update

        if (adminExists) {
            console.log('Ein Admin-Benutzer existiert bereits. Überschreibe Passwort...');
            adminExists.password = await bcrypt.hash('password123', 10);
            await adminExists.save();
            console.log('✅ Passwort für "admin" erfolgreich auf "password123" zurückgesetzt.');
        } else {
            const newAdmin = await User.create({
                username: 'admin',
                password: 'password123', // Wird von beforeCreate Hook in User.js gehasht
                displayName: 'Administrator',
                email: 'admin@example.com',
                isAdmin: true,
                authMethod: 'local'
            });
            console.log('✅ Admin-Benutzer erfolgreich erstellt!');
            console.log('Benutzername: admin');
            console.log('Passwort: password123');
        }
    } catch (err) {
        console.error('Fehler beim Erstellen des Admin-Benutzers:', err);
    } finally {
        await sequelize.close();
    }
}

createAdmin();
