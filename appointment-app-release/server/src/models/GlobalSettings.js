const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GlobalSettings = sequelize.define('GlobalSettings', {
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isEncrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
});

module.exports = GlobalSettings;
