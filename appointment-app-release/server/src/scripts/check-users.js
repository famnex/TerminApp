const User = require('../models/User');
const sequelize = require('../config/database');

async function listUsers() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const users = await User.findAll();

        console.log('--- Users in Database ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('-------------------------');

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

listUsers();
