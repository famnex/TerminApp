const mailService = require('../src/services/mail');
const { Booking, Topic, User, GlobalSettings, sequelize } = require('../src/models');

async function testMailICal() {
    try {
        console.log('Testing Mail iCal Attachment...');

        // Ensure we have at least one booking to test with
        let booking = await Booking.findOne({
            include: [
                { model: Topic },
                { model: User, as: 'Provider' }
            ]
        });

        if (!booking) {
            console.log('No booking found. Creating a temporary one...');
            // This might fail if models have complex dependencies, but let's try a minimal one
            // Or just mock the booking object
            booking = {
                id: 1,
                customerName: 'Test Kunde',
                customerEmail: 'test@example.com',
                slotStartTime: new Date(),
                slotEndTime: new Date(Date.now() + 3600000),
                cancellationToken: 'test-token',
                TopicId: 1,
                UserId: 1
            };
        }

        // We can override the transporter in mailService or just check console output
        // since getTransporter uses console.log if no SMTP is configured.

        console.log('\n--- Triggering sendConfirmation ---\n');
        await mailService.sendConfirmation(booking);
        console.log('\n--- End of sendConfirmation ---\n');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await sequelize.close();
    }
}

testMailICal();
