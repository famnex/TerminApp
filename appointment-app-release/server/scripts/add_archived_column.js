const sequelize = require('../src/config/database');

async function addArchivedColumn() {
    try {
        console.log('Adding isArchived column to Bookings...');
        await sequelize.query("ALTER TABLE Bookings ADD COLUMN isArchived BOOLEAN DEFAULT 0;");
        console.log('Column added successfully.');
    } catch (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column already exists.');
        } else {
            console.error('Error adding column:', err);
        }
    }
}

addArchivedColumn();
