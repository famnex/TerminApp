const { GlobalSettings, sequelize } = require('../src/models');

async function inspectSettings() {
    try {
        const settings = await GlobalSettings.findAll();
        console.log('\n=== GLOBAL SETTINGS ===');
        settings.forEach(s => console.log(`Key: '${s.key}', Value: '${s.value}'`));
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

inspectSettings();
