const { Booking } = require('./src/models');
const { sequelize } = require('./src/models');

async function getToken() {
    try {
        const booking = await Booking.findOne({
            order: [['createdAt', 'DESC']],
        });

        if (booking) {
            console.log('LATEST_TOKEN:', booking.cancellationToken);
            console.log('CUSTOMER:', booking.customerName);
        } else {
            console.log('No bookings found.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

getToken();
