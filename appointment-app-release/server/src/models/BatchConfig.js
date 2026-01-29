const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BatchConfig = sequelize.define('BatchConfig', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('topic', 'availability'),
        allowNull: false,
    },
    targetType: {
        type: DataTypes.ENUM('user', 'department'),
        allowNull: false,
        defaultValue: 'user'
    },
    configData: {
        type: DataTypes.JSON, // Stores the template (e.g., { title: "X", duration: 30 } or { startTime: "09:00" ... })
        allowNull: false,
    },
    applyToFuture: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
});

module.exports = BatchConfig;
