const DEFAULT_BOOKING_DEADLINE = 'hours_48';
const BOOKING_DEADLINES = ['slot_start', 'hours_24', DEFAULT_BOOKING_DEADLINE];
// Fixed elapsed hours, independent of calendar days, server timezone or DST.
function isBookingOpen(slotStart, policy = DEFAULT_BOOKING_DEADLINE, now = new Date()) {
    const slot = new Date(slotStart), current = new Date(now);
    if (!Number.isFinite(slot.getTime()) || !Number.isFinite(current.getTime()) || slot <= current) return false;
    const effective = BOOKING_DEADLINES.includes(policy) ? policy : DEFAULT_BOOKING_DEADLINE;
    const hours = effective === 'slot_start' ? 0 : effective === 'hours_24' ? 24 : 48;
    return slot.getTime() - current.getTime() >= hours * 60 * 60 * 1000;
}
module.exports = { DEFAULT_BOOKING_DEADLINE, BOOKING_DEADLINES, isBookingOpen };
