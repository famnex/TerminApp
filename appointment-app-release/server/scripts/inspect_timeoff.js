const { sequelize, TimeOff } = require('../src/models');

async function inspectTimeOff() {
    try {
        const timeOffs = await TimeOff.findAll();
        console.log('\n=== TIMEOFF ===');
        timeOffs.forEach(t => console.log(`ID: ${t.id}, UserID: ${t.userId}, Start: ${t.startDate}, End: ${t.endDate}`));

        const orphaned = timeOffs.filter(t => !t.userId);
        if (orphaned.length > 0) {
            console.log('\n!!! ORPHANED TIMEOFF FOUND !!!');
            console.log(orphaned.map(t => t.id));
        } else {
            console.log('No orphaned TimeOff records found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

inspectTimeOff();
