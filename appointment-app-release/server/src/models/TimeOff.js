const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimeOff = sequelize.define('TimeOff', {
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true,
    }
});

module.exports = TimeOff;
