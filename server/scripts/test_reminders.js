const { Op } = require('sequelize');
const { Booking } = require('../src/models');
const { addMinutes } = require('date-fns');

async function testQuery() {
    try {
        console.log('Testing Reminder Query...');

        // Mock finding the setting (or actually find it if we want integration test)
        // For verify, we'll just check if querying logic works with a variable variable
        const { GlobalSettings } = require('../src/models');
        console.log('Fetching settings...');
        const settings = await GlobalSettings.findAll({ where: { key: 'reminder_lead_time' } });
        const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
        const leadTime = parseInt(config.reminder_lead_time) || 10;

        console.log(`Using Lead Time: ${leadTime} minutes`);

        const now = new Date();
        const startWindow = addMinutes(now, leadTime);
        const endWindow = addMinutes(now, leadTime + 1);

        console.log('Range:', startWindow.toISOString(), 'to', endWindow.toISOString());

        const bookings = await Booking.findAll({
            where: {
                status: 'confirmed',
                reminderSent: false,
                slotStartTime: {
                    [Op.gte]: startWindow.toISOString().replace('T', ' ').substring(0, 19),
                    [Op.lt]: endWindow.toISOString().replace('T', ' ').substring(0, 19)
                }
            },
            logging: console.log
        });

        console.log('Found:', bookings.length);
    } catch (err) {
        console.error('Error:', err);
    }
}

testQuery();
