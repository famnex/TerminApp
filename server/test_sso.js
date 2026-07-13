const jwt = require('jsonwebtoken');
const { GlobalSettings } = require('./src/models');
const sequelize = require('./src/config/database');

async function setupSsoTest() {
    try {
        await sequelize.sync();

        // 1. Configure SSO Settings in DB
        await GlobalSettings.upsert({ key: 'sso_enabled', value: 'true' });
        await GlobalSettings.upsert({ key: 'sso_jwt_secret', value: 'my_super_sso_secret' });
        await GlobalSettings.upsert({ key: 'sso_jwt_param', value: 'sso_token' });
        await GlobalSettings.upsert({ key: 'sso_logout_redirect', value: 'https://google.com' });
        await GlobalSettings.upsert({ key: 'sso_logout_label', value: 'Zurück zum Portal' });

        console.log('✅ SSO-Konfiguration in DB hinterlegt!');

        // 2. Generate a valid SSO JWT Token
        const payload = {
            username: 'sso.testuser',
            displayName: 'SSO Test User',
            email: 'sso.test@schule.de',
            isAdmin: true
        };

        const token = jwt.sign(payload, 'my_super_sso_secret', { expiresIn: '1h' });

        console.log('\n--- TEST LOGIN URL ---');
        console.log(`http://localhost:5173/?sso_token=${token}`);
        console.log('----------------------\n');
        
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

setupSsoTest();
