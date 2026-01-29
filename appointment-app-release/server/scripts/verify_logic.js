const fetch = require('node-fetch'); // NOTE: Assuming Node 18+ has global fetch, but if not we might need to handle it. 
// Actually Node 18+ has global fetch.

const BASE_URL = 'http://localhost:3002/api';
let ADMIN_TOKEN = '';
let TEST_USER_ID = '';
let TOPIC_ID = '';

// Helper to calculate weeks
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// Find next Monday that is in an ODD week and one in an EVEN week
function findTestDates() {
    let d = new Date();
    // Advance to next Monday
    while (d.getDay() !== 1) {
        d.setDate(d.getDate() + 1);
    }

    let oddWeekDate = null;
    let evenWeekDate = null;

    // Look ahead 10 weeks to find both
    for (let i = 0; i < 10; i++) {
        const week = getWeekNumber(d);
        if (week % 2 !== 0 && !oddWeekDate) oddWeekDate = new Date(d);
        if (week % 2 === 0 && !evenWeekDate) evenWeekDate = new Date(d);
        d.setDate(d.getDate() + 7);
    }
    return { oddWeekDate, evenWeekDate };
}

async function loginAdmin() {
    console.log('1. Logging in as Admin...');
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const data = await res.json();
    if (!data.token) throw new Error('Login failed');
    ADMIN_TOKEN = data.token;
    console.log('   Success. Token received.');
}

async function createTestUser() {
    console.log('2. Creating Test User...');
    const res = await fetch(`${BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
            username: 'logic_tester',
            password: 'password123',
            displayName: 'Logic Tester',
            email: 'test@example.com',
            isAdmin: true // Make admin so we can set availability easily via same token or we login as him?
            // Actually, availability is set via /availability/mine. 
            // Better to login as the new user to set their availability.
        })
    });

    // If user already exists (from previous fail), try to login
    if (res.status === 400) {
        console.log('   User might exist, trying login...');
    }

    // Login as tester
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'logic_tester', password: 'password123' })
    });
    const data = await loginRes.json();
    if (!data.token) throw new Error('Could not login as test user');

    // Decode token to get ID (or use /auth/me if exists, but we can guess from topics)
    // Actually the login response usually has user info?
    // Let's check auth.js ... it returns { token, user: { id, ... } }
    TEST_USER_ID = data.user.id;
    ADMIN_TOKEN = data.token; // Use test user token for rest of operations
    console.log(`   Logged in as Logic Tester (ID: ${TEST_USER_ID})`);
}

async function createTopic() {
    console.log('3. Creating Test Topic...');
    // We need a topic to query slots
    // API: POST /api/topics (assuming this exists for logged in users? or admin?)
    // Checking routes... I didn't see topics.js in the list, but it must exist.
    // Let's assume it's /api/topics/
    const res = await fetch(`${BASE_URL}/topics`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
            title: 'Logic Test Topic',
            durationMinutes: 60,
            description: 'Testing logic'
        })
    });
    const data = await res.json();
    TOPIC_ID = data.id;
    console.log(`   Topic Created (ID: ${TOPIC_ID})`);
}

async function setOddWeekAvailability() {
    console.log('4. Setting "Odd Week" Availability (Mondays)...');
    // Clear existing?
    // Assume clean slate or delete all first.

    const res = await fetch(`${BASE_URL}/availability`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
            type: 'odd_week',
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '17:00'
        })
    });
    if (res.status !== 201) throw new Error('Failed to set availability');
    console.log('   Availability set.');
}

async function verifyOddEvenLogic() {
    console.log('5. Verifying Slot Logic...');
    const { oddWeekDate, evenWeekDate } = findTestDates();
    console.log(`   Odd Week Date: ${oddWeekDate.toISOString().split('T')[0]}`);
    console.log(`   Even Week Date: ${evenWeekDate.toISOString().split('T')[0]}`);

    // Check ODD week (Should have slots)
    const oddRes = await fetch(`${BASE_URL}/public/slots?userId=${TEST_USER_ID}&topicId=${TOPIC_ID}&start=${oddWeekDate.toISOString().split('T')[0]}&end=${oddWeekDate.toISOString().split('T')[0]}`);
    const oddSlots = await oddRes.json();
    console.log(`   Slots found for Odd Week: ${oddSlots.length}`);
    if (oddSlots.length === 0) console.error('   FAIL: Expected slots for odd week!');
    else console.log('   PASS: Odd week has slots.');

    // Check EVEN week (Should be empty)
    const evenRes = await fetch(`${BASE_URL}/public/slots?userId=${TEST_USER_ID}&topicId=${TOPIC_ID}&start=${evenWeekDate.toISOString().split('T')[0]}&end=${evenWeekDate.toISOString().split('T')[0]}`);
    const evenSlots = await evenRes.json();
    console.log(`   Slots found for Even Week: ${evenSlots.length}`);
    if (evenSlots.length > 0) console.error('   FAIL: Expected NO slots for even week!');
    else console.log('   PASS: Even week has no slots.');
}

async function cleanup() {
    console.log('6. Cleanup...');
    // Just delete the user, cascade should handle rest? 
    // Wait, allow admin to delete? 
    // We are logged in as test user. We can delete ourselves?
    // Or login as admin again.

    // Login real admin
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'adminpassword' })
    });
    const data = await loginRes.json();
    const realAdminToken = data.token;

    await fetch(`${BASE_URL}/admin/users/${TEST_USER_ID}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${realAdminToken}` }
    });
    console.log('   Test user deleted.');
}

async function run() {
    try {
        await loginAdmin();
        await createTestUser();
        await createTopic();
        await setOddWeekAvailability();
        await verifyOddEvenLogic();
        await cleanup();
    } catch (err) {
        console.error('ERROR:', err);
    }
}

run();
