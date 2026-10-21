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
        type: DataTypes.ENUM('local', 'ldap', 'sso'),
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
    },
    bookingPageActive: {
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
        const { BatchConfig, Topic, Availability, Department } = sequelize.models;

        // 1. Check for Default Department (starred department) and assign new user
        let defaultDept = null;
        if (Department) {
            defaultDept = await Department.findOne({ where: { isDefault: true } });
            if (defaultDept) {
                console.log(`[Department] Assigning new user ${user.id} (${user.username}) to default department '${defaultDept.name}' (${defaultDept.id})`);
                await user.addDepartment(defaultDept);
            }
        }

        // 2. Find user-based batch configs that apply to all future users
        const userBatches = await BatchConfig.findAll({
            where: { targetType: 'user', applyToFuture: true }
        });

        // 3. Find department-based batch configs for the default department (if any) with applyToFuture: true
        let deptBatches = [];
        if (defaultDept) {
            deptBatches = await BatchConfig.findAll({
                where: { targetType: 'department', applyToFuture: true },
                include: [{
                    model: Department,
                    where: { id: defaultDept.id },
                    required: true
                }]
            });
        }

        const allBatches = [...userBatches, ...deptBatches];

        if (allBatches.length > 0) {
            console.log(`[Batch] Applying ${allBatches.length} rules to new user ${user.id}`);
            const promises = allBatches.map(batch => {
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
        console.error('[Batch] Error applying future rules / default department:', err);
    }
});

module.exports = User;
