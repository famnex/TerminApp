const { Availability, Booking, Topic, TimeOff, GlobalSettings } = require('../models');
const { Op } = require('sequelize');
const {
    startOfDay, endOfDay, addDays, isBefore, isAfter,
    setHours, setMinutes, addMinutes, format, getDay,
    getISOWeek, parseISO, isSameDay, areIntervalsOverlapping, addHours
} = require('date-fns');

/**
 * Calculates available slots for a given user within a date range.
 * @param {number} userId - The staff member ID.
 * @param {string} startDateStr - Start date (YYYY-MM-DD).
 * @param {string} endDateStr - End date (YYYY-MM-DD).
 * @param {number} topicId - The topic selected (to determine duration).
 */
async function getAvailableSlots(userId, startDateStr, endDateStr, topicId) {
    const start = startOfDay(parseISO(startDateStr));
    const end = endOfDay(parseISO(endDateStr));
    const topic = await Topic.findByPk(topicId);

    if (!topic) throw new Error('Topic not found');
    const duration = topic.durationMinutes;

    // Fetch Global Settings for Min Notice
    let minNoticeHours = 0;
    try {
        const setting = await GlobalSettings.findByPk('min_booking_notice_hours');
        if (setting && setting.value) {
            minNoticeHours = parseInt(setting.value, 10);
        }
    } catch (err) {
        console.error('Error fetching min_booking_notice_hours:', err);
    }

    const now = new Date();
    const minSlotTime = addHours(now, minNoticeHours);

    // 1. Fetch Availability Rules
    const availabilities = await Availability.findAll({
        where: { userId }
    });

    // 2. Fetch Time Offs (Blocked Days)
    const timeOffs = await TimeOff.findAll({
        where: {
            userId,
            [Op.or]: [
                {
                    startDate: {
                        [Op.lte]: end
                    },
                    endDate: {
                        [Op.gte]: start
                    }
                }
            ]
        }
    });

    // 3. Fetch Existing Bookings
    const bookings = await Booking.findAll({
        where: {
            providerId: userId, // Filter by the provider's ID
            status: 'confirmed',
            slotStartTime: { [Op.lt]: end },
            slotEndTime: { [Op.gt]: start }
        }
    });

    const slots = [];
    let currentDate = start;

    // Iterate through each day in the range
    while (isBefore(currentDate, end) || isSameDay(currentDate, end)) {

        // Check if day is blocked
        const isBlocked = timeOffs.some(toff => {
            const blockStart = startOfDay(parseISO(toff.startDate));
            const blockEnd = endOfDay(parseISO(toff.endDate));
            return (isAfter(currentDate, blockStart) || isSameDay(currentDate, blockStart)) &&
                (isBefore(currentDate, blockEnd) || isSameDay(currentDate, blockEnd));
        });

        if (isBlocked) {
            currentDate = addDays(currentDate, 1);
            continue;
        }

        const dayOfWeek = getDay(currentDate); // 0-6 (Sun-Sat)
        const isoWeek = getISOWeek(currentDate);
        const isOddWeek = isoWeek % 2 !== 0;

        // Filter rules relevant to this day
        const activeRules = availabilities.filter(rule => {
            // Check date validity
            if (rule.validUntil && isAfter(currentDate, parseISO(rule.validUntil))) return false;

            // Check specific date
            if (rule.type === 'specific_date') {
                return isSameDay(parseISO(rule.specificDate), currentDate);
            }

            // Check Weekday
            if (rule.dayOfWeek !== dayOfWeek) return false;

            // Check Odd/Even/Weekly
            if (rule.type === 'weekly') return true;
            if (rule.type === 'odd_week' && isOddWeek) return true;
            if (rule.type === 'even_week' && !isOddWeek) return true; // Even is when not odd

            return false;
        });

        // For each applicable rule, generate slots
        for (const rule of activeRules) {
            const [startHour, startMinute] = rule.startTime.split(':').map(Number);
            const [endHour, endMinute] = rule.endTime.split(':').map(Number);

            let slotStart = setMinutes(setHours(currentDate, startHour), startMinute);
            const ruleEnd = setMinutes(setHours(currentDate, endHour), endMinute);

            // Generate slots of 'duration' length
            while (isBefore(slotStart, ruleEnd)) {
                const slotEnd = addMinutes(slotStart, duration);

                // If slot exceeds rule end time, stop
                if (isAfter(slotEnd, ruleEnd)) break;

                // Check for min notice
                if (isBefore(slotStart, minSlotTime)) {
                    slotStart = addMinutes(slotStart, duration);
                    continue;
                }

                // Check for collisions
                const isOccupied = bookings.some(b => {
                    return (
                        (isBefore(b.slotStartTime, slotEnd) && isAfter(b.slotEndTime, slotStart))
                    );
                });

                if (!isOccupied) {
                    slots.push({
                        date: format(currentDate, 'yyyy-MM-dd'),
                        time: format(slotStart, 'HH:mm'),
                        timestamp: slotStart.toISOString(),
                        available: true
                    });
                }

                // Move to next slot (e.g., start + duration)
                // Optionally add buffer time here if needed
                slotStart = addMinutes(slotStart, duration);
            }
        }

        currentDate = addDays(currentDate, 1);
    }

    return slots;
}

module.exports = { getAvailableSlots };
