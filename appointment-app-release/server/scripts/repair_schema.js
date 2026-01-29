const { sequelize } = require('../src/models');

async function repair() {
    try {
        console.log('Attempting to repair database schema...');
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully.');
    } catch (err) {
        console.error('Repair failed:', err);
    } finally {
        await sequelize.close();
    }
}

repair();
