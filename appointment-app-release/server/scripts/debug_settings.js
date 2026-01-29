const { GlobalSettings } = require('../src/models');

async function checkSettings() {
    try {
        console.log('Checking GlobalSettings in database...');
        const settings = await GlobalSettings.findAll({
            where: {
                key: ['school_logo', 'app_title']
            }
        });

        console.log('Found Settings:', settings.length);
        settings.forEach(s => {
            console.log(`- ${s.key}: ${s.value}`);
        });

        if (settings.length === 0) {
            console.log('No settings found for school_logo or app_title.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

checkSettings();
