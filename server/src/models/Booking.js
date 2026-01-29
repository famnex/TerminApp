const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
    cancellationToken: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
    },
    slotStartTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    slotEndTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    customerName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    customerEmail: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    customerPhone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('confirmed', 'cancelled'),
        defaultValue: 'confirmed',
    },
    cancellationReason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    reminderSent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isArchived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    topicId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Topics',
            key: 'id'
        }
    },
    providerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
});

module.exports = Booking;
