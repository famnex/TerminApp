const { sequelize, User, Topic, Availability } = require('../models');
const bcrypt = require('bcrypt');

async function seed() {
    try {
        await sequelize.sync({ force: true }); // Reset DB

        // Create Admin User
        // const adminHash = await bcrypt.hash('admin123', 10);
        const admin = await User.create({
            username: 'admin',
            password: 'admin123', // Hook will hash this
            displayName: 'System Admin',
            email: 'admin@example.com',
            authMethod: 'local',
            isAdmin: true,
        });

        // Create a Staff User
        // const staffHash = await bcrypt.hash('staff123', 10);
        const staff = await User.create({
            username: 'staff',
            password: 'staff123', // Hook will hash this
            displayName: 'Max Mustermann',
            email: 'max@example.com',
            authMethod: 'local',
            isAdmin: false,
        });

        // Create Topics for Staff
        await Topic.create({
            userId: staff.id,
            title: 'Elterngespräch',
            durationMinutes: 15,
            description: 'Besprechung über den Leistungsstand.'
        });

        await Topic.create({
            userId: staff.id,
            title: 'Beratung',
            durationMinutes: 45,
            description: 'Ausführliche Beratung.'
        });

        // Create Availability for Staff
        // Every Monday 14:00 - 16:00
        await Availability.create({
            userId: staff.id,
            type: 'weekly',
            dayOfWeek: 1, // Monday
            startTime: '14:00',
            endTime: '16:00',
        });

        // Odd Wednesdays 09:00 - 12:00
        await Availability.create({
            userId: staff.id,
            type: 'odd_week',
            dayOfWeek: 3, // Wednesday
            startTime: '09:00',
            endTime: '12:00',
        });

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
