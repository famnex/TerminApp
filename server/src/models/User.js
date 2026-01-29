const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true, // Nullable for LDAP users if we don't store password
    },
    displayName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    authMethod: {
        type: DataTypes.ENUM('local', 'ldap'),
        defaultValue: 'local',
    },
    position: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    showEmail: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
});

User.beforeCreate(async (user) => {
    if (user.password && user.authMethod === 'local') {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

User.afterCreate(async (user) => {
    try {
        const { BatchConfig, Topic, Availability } = sequelize.models;

        // Find all batch configs that apply to future users
        const batches = await BatchConfig.findAll({
            where: { applyToFuture: true }
        });

        if (batches && batches.length > 0) {
            console.log(`[Batch] Applying ${batches.length} rules to new user ${user.id}`);
            const promises = batches.map(batch => {
                if (batch.type === 'topic') {
                    return Topic.create({
                        ...batch.configData,
                        userId: user.id,
                        batchConfigId: batch.id
                    });
                } else if (batch.type === 'availability') {
                    return Availability.create({
                        ...batch.configData,
                        userId: user.id,
                        batchConfigId: batch.id
                    });
                }
            });
            await Promise.all(promises);
        }
    } catch (err) {
        console.error('[Batch] Error applying future rules:', err);
    }
});

module.exports = User;
