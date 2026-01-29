const ical = require('ical-generator');
console.log('Type of ical:', typeof ical);
console.log('ical keys:', Object.keys(ical));
try {
    const calendar = ical({ name: 'Test' });
    console.log('ical() worked');
} catch (e) {
    console.log('ical() failed:', e.message);
}
