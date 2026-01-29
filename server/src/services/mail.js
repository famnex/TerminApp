const nodemailer = require('nodemailer');
const ical = require('ical-generator').default;
const { GlobalSettings, Booking, Topic, User } = require('../models');

// Helper function to format date in German
function formatGermanDate(date) {
    const d = new Date(date);
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    const dayName = days[d.getDay()];
    const day = d.getDate().toString().padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${dayName}, ${day}. ${month} ${year} um ${hours}:${minutes} Uhr`;
}

// Helper to get transporter
async function getTransporter() {
    const settings = await GlobalSettings.findAll();
    const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

    // Convert port/secure to correct types
    const smtpPort = parseInt(config.smtp_port) || 587;
    let isSecure = config.smtp_secure === 'true' || config.smtp_secure === true || config.smtp_secure === '1' || config.smtp_secure === 1;

    // Auto-fix: Port 587 is usually STARTTLS (secure: false)
    if (smtpPort === 587 && isSecure) {
        isSecure = false;
    }

    // Format the from address
    const fromAddress = `"${config.smtp_from_name || 'Termin App'}" <${config.smtp_from_email || config.smtp_user}>`;

    if (config.smtp_host) {
        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: smtpPort,
            secure: isSecure,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        return { transporter, fromAddress };
    }

    // Fallback: Mock Transporter (Log to Console)
    return {
        transporter: {
            sendMail: async (mailOptions) => {
                console.log('---------------------------------------------------');
                console.log('MOCK MAIL SENT');
                console.log('To:', mailOptions.to);
                console.log('Subject:', mailOptions.subject);
                console.log('Body:', mailOptions.text);
                if (mailOptions.icalEvent) console.log('Contains iCal Attachment');
                console.log('---------------------------------------------------');
                return { messageId: 'mock-id' };
            }
        },
        fromAddress: '"Termin App" <noreply@localhost>'
    };
}

const mailService = {
    sendConfirmation: async (booking) => {
        console.log('[MailService] sendConfirmation started for booking:', booking.id);
        try {
            const { transporter, fromAddress } = await getTransporter();
            console.log('[MailService] Transporter created.');

            const fullBooking = await Booking.findByPk(booking.id, {
                include: [
                    { model: Topic },
                    { model: User, as: 'Provider' }
                ]
            });
            console.log('[MailService] Full booking fetched.');

            const topicTitle = fullBooking?.Topic?.title || 'Termin';
            const expertName = fullBooking?.Provider?.displayName || 'Experte';
            const location = fullBooking?.Provider?.location || 'Online / Vor Ort';
            const expertEmail = fullBooking?.Provider?.email;

            const recipients = [booking.customerEmail];
            if (expertEmail) recipients.push(expertEmail);

            // Filter out empty or invalid emails
            const validRecipients = recipients.filter(email => email && email.trim() !== '');

            if (validRecipients.length === 0) {
                console.warn('[MailService] No valid recipients for confirmation. Skipping.');
                return;
            }

            console.log('[MailService] Sending confirmation to:', validRecipients);

            const formattedDate = formatGermanDate(booking.slotStartTime);
            const cancelUrl = `http://localhost:5173/cancel/${booking.cancellationToken}`;

            // Create iCal with full details
            const calendar = ical({ name: 'Terminbuchung' });
            calendar.createEvent({
                start: booking.slotStartTime,
                end: booking.slotEndTime,
                summary: topicTitle,
                description: `Termin mit ${expertName}\nThema: ${topicTitle}\nOrt: ${location}`,
                location: location,
                url: cancelUrl,
                organizer: { name: expertName, email: expertEmail || 'noreply@localhost' },
                attendees: [
                    { name: booking.customerName || 'Teilnehmer', email: booking.customerEmail }
                ]
            });

            const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
.content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
.detail { margin: 10px 0; }
.detail strong { display: inline-block; width: 100px; }
.button { display: inline-block; padding: 10px 20px; background-color: #f44336; color: white; text-decoration: none; margin-top: 20px; }
.footer { margin-top: 20px; font-size: 12px; color: #777; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2>✓ Terminbestätigung</h2>
</div>
<div class="content">
<p>Ihr Termin wurde erfolgreich gebucht.</p>
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Experte:</strong> ${expertName}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Ort:</strong> ${location}</div>
<div class="detail"><strong>Name:</strong> ${booking.customerName || 'Nicht angegeben'}</div>
<p style="margin-top: 20px;">Ein Kalendereintrag (iCal) ist dieser E-Mail beigefügt.</p>
<a href="${cancelUrl}" class="button">Termin stornieren</a>
</div>
<div class="footer">
<p>Sie erhalten 10 Minuten vor dem Termin eine Erinnerung.</p>
</div>
</div>
</body>
</html>`;

            const textContent = `Terminbestätigung\n\nIhr Termin wurde erfolgreich gebucht.\n\nThema: ${topicTitle}\nExperte: ${expertName}\nZeit: ${formattedDate}\nOrt: ${location}\nName: ${booking.customerName || 'Nicht angegeben'}\n\nStornieren: ${cancelUrl}`;

            const info = await transporter.sendMail({
                from: fromAddress,
                to: validRecipients,
                subject: '✓ Terminbestätigung: ' + topicTitle,
                text: textContent,
                html: htmlContent,
                icalEvent: {
                    filename: 'termin.ics',
                    method: 'REQUEST',
                    content: calendar.toString()
                }
            });
            console.log('[MailService] Confirmation sent:', info.messageId);
        } catch (error) {
            console.error('[MailService] sendConfirmation FAILED:', error);
            // Don't throw, just log, so we don't crash main thread if this is async
        }
    },

    sendCancellation: async (booking) => {
        console.log('[MailService] sendCancellation started for booking:', booking.id);
        try {
            const { transporter, fromAddress } = await getTransporter();

            const fullBooking = await Booking.findByPk(booking.id, {
                include: [
                    { model: Topic },
                    { model: User, as: 'Provider' }
                ]
            });
            const expertEmail = fullBooking?.Provider?.email;
            const expertName = fullBooking?.Provider?.displayName || 'Experte';
            const topicTitle = fullBooking?.Topic?.title || 'Termin';

            const recipients = [booking.customerEmail];
            if (expertEmail) recipients.push(expertEmail);

            // Filter out empty or invalid emails
            const validRecipients = recipients.filter(email => email && email.trim() !== '');

            if (validRecipients.length === 0) {
                console.warn('[MailService] No valid recipients for cancellation. Skipping.');
                return;
            }

            console.log('[MailService] Sending cancellation to:', validRecipients);

            const formattedDate = formatGermanDate(booking.slotStartTime);
            const reason = booking.cancellationReason || 'Keine Angabe';

            const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
.content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
.detail { margin: 10px 0; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2>✗ Termin storniert</h2>
</div>
<div class="content">
<p>Der folgende Termin wurde storniert:</p>
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Experte:</strong> ${expertName}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Grund:</strong> ${reason}</div>
</div>
</div>
</body>
</html>`;

            const textContent = `Termin storniert\n\nDer folgende Termin wurde storniert:\n\nThema: ${topicTitle}\nExperte: ${expertName}\nZeit: ${formattedDate}\nGrund: ${reason}`;

            const info = await transporter.sendMail({
                from: fromAddress,
                to: validRecipients,
                subject: '✗ Termin storniert: ' + topicTitle,
                text: textContent,
                html: htmlContent
            });
            console.log('[MailService] Cancellation sent:', info.messageId);
        } catch (error) {
            console.error('[MailService] sendCancellation FAILED:', error);
        }
    },

    sendReminder: async (booking, leadTime = 10) => {
        console.log('[MailService] sendReminder started for booking:', booking.id, 'LeadTime:', leadTime);
        try {
            const { transporter, fromAddress } = await getTransporter();

            const fullBooking = await Booking.findByPk(booking.id, {
                include: [
                    { model: Topic },
                    { model: User, as: 'Provider' }
                ]
            });

            const topicTitle = fullBooking?.Topic?.title || 'Termin';
            const expertName = fullBooking?.Provider?.displayName || 'Experte';
            const location = fullBooking?.Provider?.location || 'Online / Vor Ort';
            const expertEmail = fullBooking?.Provider?.email;

            const recipients = [booking.customerEmail];
            if (expertEmail) recipients.push(expertEmail);

            // Filter out empty or invalid emails
            const validRecipients = recipients.filter(email => email && email.trim() !== '');

            if (validRecipients.length === 0) {
                console.warn('[MailService] No valid recipients for reminder. Skipping.');
                return;
            }

            console.log('[MailService] Sending reminder to:', validRecipients);

            const formattedDate = formatGermanDate(booking.slotStartTime);

            const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
.content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
.detail { margin: 10px 0; }
.alert { background-color: #fff3cd; padding: 15px; border-left: 4px solid #FF9800; margin-bottom: 20px; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2>🔔 Terminerinnerung</h2>
</div>
<div class="content">
<div class="alert">
<strong>Ihr Termin beginnt in ${leadTime} Minuten!</strong>
</div>
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Experte:</strong> ${expertName}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Ort:</strong> ${location}</div>
</div>
</div>
</body>
</html>`;

            const textContent = `🔔 Terminerinnerung\n\nIhr Termin beginnt in ${leadTime} Minuten!\n\nThema: ${topicTitle}\nExperte: ${expertName}\nZeit: ${formattedDate}\nOrt: ${location}`;

            const info = await transporter.sendMail({
                from: fromAddress,
                to: validRecipients,
                subject: `🔔 Erinnerung: Termin in ${leadTime} Minuten`,
                text: textContent,
                html: htmlContent
            });
            console.log('[MailService] Reminder sent:', info.messageId);
        } catch (error) {
            console.error('[MailService] sendReminder FAILED:', error);
        }
    },

    sendRecoveryLink: async (email, bookings) => {
        try {
            const { transporter, fromAddress } = await getTransporter();

            // Fetch full booking details with Topic and User
            const bookingIds = bookings.map(b => b.id);
            const fullBookings = await Booking.findAll({
                where: { id: bookingIds },
                include: [
                    { model: Topic },
                    { model: User, as: 'Provider' }
                ]
            });

            if (fullBookings.length === 0) {
                console.log('[MailService] No bookings to send in recovery email');
                return;
            }

            // Build HTML table
            let htmlRows = '';
            let textRows = '';

            fullBookings.forEach(booking => {
                const topicTitle = booking?.Topic?.title || 'Termin';
                const expertName = booking?.Provider?.displayName || 'Experte';
                const location = booking?.Provider?.location || 'Online / Vor Ort';
                const formattedDate = formatGermanDate(booking.slotStartTime);
                const cancelUrl = `http://localhost:5173/cancel/${booking.cancellationToken}`;

                htmlRows += `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${topicTitle}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${expertName}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${location}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">
                            <a href="${cancelUrl}" style="color: #f44336; text-decoration: none;">Stornieren</a>
                        </td>
                    </tr>
                `;

                textRows += `\n- ${topicTitle} mit ${expertName}\n  Zeit: ${formattedDate}\n  Ort: ${location}\n  Stornieren: ${cancelUrl}\n`;
            });

            const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 800px; margin: 0 auto; padding: 20px; }
.header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
.content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
table { width: 100%; border-collapse: collapse; background-color: white; }
th { background-color: #2196F3; color: white; padding: 12px; text-align: left; }
td { padding: 12px; border-bottom: 1px solid #ddd; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2>📅 Ihre gebuchten Termine</h2>
</div>
<div class="content">
<p>Hier finden Sie eine Übersicht Ihrer aktiven Termine:</p>
<table>
<thead>
<tr>
<th>Thema</th>
<th>Experte</th>
<th>Zeit</th>
<th>Ort</th>
<th>Aktion</th>
</tr>
</thead>
<tbody>
${htmlRows}
</tbody>
</table>
<p style="margin-top: 20px; font-size: 12px; color: #777;">
Über den Stornierungslink können Sie jeden Termin einzeln absagen.
</p>
</div>
</div>
</body>
</html>`;

            const textContent = `📅 Ihre gebuchten Termine\n\nHier finden Sie eine Übersicht Ihrer aktiven Termine:${textRows}\n\nÜber die Stornierungslinks können Sie Termine absagen.`;

            await transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: '📅 Ihre gebuchten Termine',
                text: textContent,
                html: htmlContent
            });
            console.log('[MailService] Recovery email sent to:', email);
        } catch (error) {
            console.error('[MailService] sendRecoveryLink FAILED:', error);
        }
    }
};

module.exports = mailService;
