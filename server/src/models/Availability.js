const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Availability = sequelize.define('Availability', {
    type: {
        type: DataTypes.ENUM('daily', 'weekly', 'odd_week', 'even_week', 'specific_date'),
        allowNull: false,
    },
    dayOfWeek: {
        type: DataTypes.INTEGER, // 0-6 (Sun-Sat)
        allowNull: true, // Null if specific_date
    },
    specificDate: {
        type: DataTypes.DATEONLY,
        allowNull: true, // Only if type is specific_date
    },
    startTime: {
        type: DataTypes.STRING, // "14:00"
        allowNull: false,
    },
    endTime: {
        type: DataTypes.STRING, // "16:00"
        allowNull: false,
    },
    validUntil: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    batchConfigId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'BatchConfigs',
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
});

module.exports = Availability;
