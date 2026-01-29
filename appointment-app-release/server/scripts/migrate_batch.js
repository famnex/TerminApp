const { sequelize } = require('../src/models');
const { DataTypes } = require('sequelize');

async function migrate() {
    const queryInterface = sequelize.getQueryInterface();

    console.log('Running migration...');

    try {
        // 1. Add batchConfigId to Topics
        console.log('Adding batchConfigId to Topics...');
        await queryInterface.addColumn('Topics', 'batchConfigId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'BatchConfigs',
                key: 'id'
            },
            onDelete: 'CASCADE'
        });
        console.log('Topics updated.');
    } catch (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column batchConfigId already exists in Topics.');
        } else {
            console.error('Error updating Topics:', err);
        }
    }

    try {
        // 2. Add batchConfigId to Availabilities
        console.log('Adding batchConfigId to Availabilities...');
        await queryInterface.addColumn('Availabilities', 'batchConfigId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'BatchConfigs',
                key: 'id'
            },
            onDelete: 'CASCADE'
        });
        console.log('Availabilities updated.');
    } catch (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column batchConfigId already exists in Availabilities.');
        } else {
            console.error('Error updating Availabilities:', err);
        }
    }

    console.log('Migration complete.');
}

migrate();
