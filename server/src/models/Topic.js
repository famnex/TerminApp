const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Topic = sequelize.define('Topic', {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
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
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
});

module.exports = Topic;
