const cron = require('node-cron');
const { Op } = require('sequelize');
const { Booking, GlobalSettings } = require('../models');
const mailService = require('../services/mail');
const { addMinutes, subMinutes } = require('date-fns');

function startReminderJob() {
    console.log('Starting Reminder Cron Job...');

    // Run every minute
    cron.schedule('* * * * *', async () => {
        try {
            // Fetch configuration
            const settings = await GlobalSettings.findAll({
                where: { key: 'reminder_lead_time' }
            });
            const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

            // Default to 10 minutes if not set
            const leadTime = parseInt(config.reminder_lead_time) || 10;

            const now = new Date();
            const reminderTimeStart = addMinutes(now, leadTime);
            const reminderTimeEnd = addMinutes(now, leadTime + 1); // 1-minute window

            // Find confirmed bookings starting in X minutes that haven't been reminded
            const bookings = await Booking.findAll({
                where: {
                    status: 'confirmed',
                    reminderSent: false,
                    slotStartTime: {
                        [Op.gte]: reminderTimeStart.toISOString().replace('T', ' ').substring(0, 19),
                        [Op.lt]: reminderTimeEnd.toISOString().replace('T', ' ').substring(0, 19)
                    }
                }
            });

            if (bookings.length > 0) {
                console.log(`Found ${bookings.length} appointments for reminder (Lead Time: ${leadTime} min).`);
                for (const booking of bookings) {
                    await mailService.sendReminder(booking, leadTime);
                    booking.reminderSent = true;
                    await booking.save();
                }
            }
        } catch (err) {
            console.error('Reminder Job Error:', err);
        }
    });
}

module.exports = startReminderJob;
