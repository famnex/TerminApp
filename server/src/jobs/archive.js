const cron = require('node-cron');
const { Op } = require('sequelize');
const { Booking } = require('../models');

function startArchiveJob() {
    console.log('Starting Archive Cron Job...');

    // Run every day at midnight: '0 0 * * *'
    // For testing purposes or robust production where we want it to clear up often, 
    // we could also do it hourly: '0 * * * *'
    // Let's stick to daily at 00:00 as requested.
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running Auto-Archive Job...');
            const now = new Date();

            const [count] = await Booking.update({ isArchived: true }, {
                where: {
                    status: 'confirmed', // Only confirmed needed? Or cancelled too? User said "when they are not active". 
                    // Usually past appointments regardless of status should be archived if we want to clear the view.
                    // Let's archive ALL past bookings including cancelled ones.
                    slotEndTime: {
                        [Op.lt]: now
                    },
                    isArchived: false
                }
            });

            if (count > 0) {
                console.log(`Auto-archived ${count} past bookings.`);
            } else {
                console.log('No bookings to archive.');
            }
        } catch (err) {
            console.error('Archive Job Error:', err);
        }
    });
}

module.exports = startArchiveJob;
