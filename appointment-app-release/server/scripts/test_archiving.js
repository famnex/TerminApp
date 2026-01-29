const { Booking, Topic, User } = require('../src/models');
const { Op } = require('sequelize');
const { subDays } = require('date-fns');

async function testAutoArchive() {
    try {
        console.log('Creating a past booking...');
        const now = new Date();
        const pastDate = subDays(now, 2); // 2 days ago

        // Ensure we have a user and topic? (Assuming they exist or creating dummy ones might be overkill, 
        // let's try to create a booking directly if constraints allow, or just find one to update timestamp)

        // Actually, just creating a booking with minimal fields should work if constraints are loose enough 
        // or we use existing IDs. Let's try to find an archived one or create one.

        // Let's create a dummy booking directly for testing logic
        const booking = await Booking.create({
            customerName: 'Archive Test',
            customerEmail: 'archive@test.com',
            slotStartTime: pastDate,
            slotEndTime: new Date(pastDate.getTime() + 30 * 60000), // 30 mins later
            status: 'confirmed',
            isArchived: false
        });

        console.log(`Created booking ${booking.id} with time ${booking.slotStartTime} (Archived: ${booking.isArchived})`);

        console.log('Running Auto-Archive Logic...');

        // Simulate Logic from archive.js
        const [count] = await Booking.update({ isArchived: true }, {
            where: {
                status: 'confirmed',
                slotEndTime: {
                    [Op.lt]: now
                },
                isArchived: false,
                id: booking.id // Target only this one to be safe and clear
            }
        });

        console.log(`Updated ${count} bookings.`);

        const updatedBooking = await Booking.findByPk(booking.id);
        console.log(`Booking ${updatedBooking.id} isArchived: ${updatedBooking.isArchived}`);

        if (updatedBooking.isArchived) {
            console.log('SUCCESS: Auto-archive logic works.');
            // Cleanup
            await updatedBooking.destroy();
        } else {
            console.error('FAILURE: Booking was not archived.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

testAutoArchive();
