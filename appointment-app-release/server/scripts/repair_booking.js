const { Booking } = require('../src/models');

async function repairBooking() {
    try {
        console.log('Attempting to repair Booking table...');
        await Booking.sync({ alter: true });
        console.log('Booking table synced successfully.');
    } catch (err) {
        console.error('Repair failed:', err);
    }
}

repairBooking();
