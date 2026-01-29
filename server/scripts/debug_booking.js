const { sequelize, Booking, User, Topic } = require('../src/models');

async function debugBooking() {
    try {
        console.log('\n=== BUCHUNGS-DEBUG ===\n');

        // Find latest booking
        const booking = await Booking.findOne({
            order: [['id', 'DESC']],
            include: [
                { model: Topic },
                { model: User }
            ]
        });

        if (!booking) {
            console.log('Keine Buchungen gefunden.');
            return;
        }

        console.log('Buchung ID:', booking.id);
        console.log('TopicId:', booking.TopicId);
        console.log('UserId:', booking.UserId);
        console.log('Kunde:', booking.customerName, '/', booking.customerEmail);
        console.log('\nZugeordnetes Topic:');
        console.log('  Title:', booking.Topic?.title || 'NICHT GEFUNDEN');

        console.log('\nZugeordneter User (Experte):');
        console.log('  ID:', booking.User?.id || 'NICHT GEFUNDEN');
        console.log('  Username:', booking.User?.username);
        console.log('  DisplayName:', booking.User?.displayName);
        console.log('  Email:', booking.User?.email);
        console.log('  Location:', booking.User?.location);

        // Check if User exists separately
        if (booking.UserId) {
            const user = await User.findByPk(booking.UserId);
            console.log('\n--- Direkte User-Abfrage ---');
            console.log('  ID:', user?.id);
            console.log('  DisplayName:', user?.displayName);
            console.log('  Email:', user?.email);
            console.log('  Location:', user?.location);
        }

        // Check Topic ownership
        if (booking.TopicId) {
            const topic = await Topic.findByPk(booking.TopicId, {
                include: [{ model: User }]
            });
            console.log('\n--- Topic Owner (sollte der Experte sein) ---');
            console.log('  Topic:', topic?.title);
            console.log('  UserId:', topic?.UserId);
            console.log('  Owner Name:', topic?.User?.displayName);
            console.log('  Owner Location:', topic?.User?.location);
        }

    } catch (err) {
        console.error('Fehler:', err);
    } finally {
        await sequelize.close();
    }
}

debugBooking();
