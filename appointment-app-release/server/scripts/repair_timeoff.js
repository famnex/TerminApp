const { sequelize, User, TimeOff } = require('../src/models');

async function repairTimeOff() {
    try {
        const adminUser = await User.findOne();
        if (!adminUser) {
            console.log('No user found');
            return;
        }

        console.log(`Linking TimeOff orphans to User ${adminUser.id}...`);

        const [updated] = await TimeOff.update(
            { userId: adminUser.id },
            { where: { userId: null } }
        );
        console.log(`Repaired ${updated} TimeOff records.`);

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

repairTimeOff();
