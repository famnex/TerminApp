const { sequelize, Booking, User, Topic } = require('../src/models');
const mailService = require('../src/services/mail');

async function testMail() {
    try {
        console.log('--- Testing Mail Service with Data Fix ---');

        // Find the broken booking or create one
        let booking = await Booking.findByPk(1);

        if (booking) {
            console.log('Found booking 1. Fixing email...');
            booking.customerEmail = 'test@example.com'; // Use a dummy valid email or specific test one
            await booking.save();
            console.log('Booking 1 updated with valid email.');
        } else {
            // Create a dummy booking if not exists
            booking = await Booking.create({
                slotStartTime: new Date(),
                slotEndTime: new Date(Date.now() + 3600000),
                customerName: 'Test Customer',
                customerEmail: 'test@example.com',
                status: 'confirmed',
                cancellationToken: 'test-token'
            });
        }

        console.log('Testing with booking ID:', booking.id);
        console.log('Customer Email:', booking.customerEmail);

        console.log('\n--> calling sendCancellation...');
        await mailService.sendCancellation(booking);

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await sequelize.close();
    }
}

testMail();
