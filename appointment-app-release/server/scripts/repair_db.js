const { sequelize, User, Availability, Topic } = require('../src/models');

async function repair() {
    try {
        const adminUser = await User.findOne();
        if (!adminUser) {
            console.log('No user found');
            return;
        }

        console.log(`Linking orphans to User ${adminUser.id} (${adminUser.displayName})...`);

        // Repair Availabilities
        const [updatedAvail] = await Availability.update(
            { userId: adminUser.id },
            { where: { userId: null } }
        );
        console.log(`Repaired ${updatedAvail} Availabilities.`);

        // Repair Topics
        const [updatedTopics] = await Topic.update(
            { userId: adminUser.id },
            { where: { userId: null } }
        );
        console.log(`Repaired ${updatedTopics} Topics.`);

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

repair();
