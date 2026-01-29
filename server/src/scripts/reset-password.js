const User = require('../models/User');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

async function resetPassword(username, newPassword) {
    try {
        await sequelize.authenticate();

        const user = await User.findOne({ where: { username } });
        if (!user) {
            console.log(`User '${username}' not found.`);
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        console.log(`Password for user '${username}' has been reset successfully.`);

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await sequelize.close();
    }
}

// Usage: node reset-password.js <username> <password>
// Defaults to admin / admin123
const targetUser = process.argv[2] || 'admin';
const targetPass = process.argv[3] || 'admin123';

resetPassword(targetUser, targetPass);
