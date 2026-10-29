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

            const fullBooking = await Booking.findByPk(booking.id, {
                include: [
                    { model: Topic },
                    { model: User, as: 'Provider' }
                ]
            });

            const topicTitle = fullBooking?.Topic?.title || 'Termin';
            const expertName = fullBooking?.Provider?.displayName || 'Experte';
            const location = fullBooking?.Provider?.location || 'Keine Angabe';
            const expertEmail = fullBooking?.Provider?.email;
            const customerEmail = booking.customerEmail;

            const globalSettingsList = await GlobalSettings.findAll();
            const config = {};
            globalSettingsList.forEach(setting => {
                config[setting.key] = setting.value;
            });
            const rawAppUrl = config.app_url || 'https://cloud.mso-hef.de/termin';
            const appUrl = rawAppUrl.replace(/\/$/, '');

            const formattedDate = formatGermanDate(booking.slotStartTime);
            const customerCancelUrl = `${appUrl}/#/cancel/${booking.cancellationToken}?role=customer`;
            const providerCancelUrl = `${appUrl}/#/cancel/${booking.cancellationToken}?role=provider`;
            const providerDashboardUrl = `${appUrl}/#/dashboard/appointments`;

            // Create iCal with full details
            const calendar = ical({ name: 'Terminbuchung' });
            calendar.createEvent({
                start: booking.slotStartTime,
                end: booking.slotEndTime,
                summary: topicTitle,
                description: `Termin mit ${expertName}\nThema: ${topicTitle}\nOrt: ${location}`,
                location: location,
                url: customerCancelUrl,
                organizer: { name: expertName, email: expertEmail || config.smtp_from_email || config.smtp_user || 'noreply@cloud.mso-hef.de' },
                attendees: [
                    { name: booking.customerName || 'Teilnehmer', email: booking.customerEmail }
                ]
            });
            const icalString = calendar.toString();

            // 1. Send Customer Confirmation Email
            if (customerEmail && customerEmail.trim() !== '') {
                const customerHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
.content { background-color: #f9f9f9; padding: 20px; }
.detail { margin: 10px 0; }
.detail strong { display: inline-block; width: 100px; }
.button { display: inline-block; padding: 10px 20px; background-color: #f44336; color: #ffffff !important; text-decoration: none; margin-top: 20px; border-radius: 4px; font-weight: bold; }
.footer { margin-top: 20px; font-size: 12px; color: #777; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2 style="margin:0;">✓ Terminbestätigung</h2>
</div>
<div class="content">
<p>Hallo <strong>${booking.customerName || 'Kunde'}</strong>,</p>
<p>Ihr Termin wurde erfolgreich gebucht.</p>
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Experte:</strong> ${expertName}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Ort:</strong> ${location}</div>
<div class="detail"><strong>Name:</strong> ${booking.customerName || 'Nicht angegeben'}</div>
<div class="detail"><strong>E-Mail:</strong> ${booking.customerEmail || 'Nicht angegeben'}</div>
<div class="detail"><strong>Telefon:</strong> ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}</div>
<p style="margin-top: 20px;">Ein Kalendereintrag (iCal) ist dieser E-Mail beigefügt.</p>
<a href="${customerCancelUrl}" class="button">Termin stornieren</a>
</div>
<div class="footer">
<p>Sie erhalten 10 Minuten vor dem Termin eine Erinnerung.</p>
</div>
</div>
</body>
</html>`;

                const customerText = `Terminbestätigung\n\nHallo ${booking.customerName || 'Kunde'},\n\nIhr Termin wurde erfolgreich gebucht.\n\nThema: ${topicTitle}\nExperte: ${expertName}\nZeit: ${formattedDate}\nOrt: ${location}\nName: ${booking.customerName || 'Nicht angegeben'}\nE-Mail: ${booking.customerEmail || 'Nicht angegeben'}\nTelefon: ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}\n\nTermin stornieren: ${customerCancelUrl}`;

                await transporter.sendMail({
                    from: fromAddress,
                    to: customerEmail,
                    subject: '✓ Terminbestätigung: ' + topicTitle,
                    text: customerText,
                    html: customerHtml,
                    icalEvent: {
                        filename: 'termin.ics',
                        method: 'REQUEST',
                        content: icalString
                    }
                });
                console.log('[MailService] Confirmation sent to customer:', customerEmail);
            }

            // 2. Send Expert Notification Email
            if (expertEmail && expertEmail.trim() !== '') {
                const expertHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
.content { background-color: #f9f9f9; padding: 20px; }
.detail { margin: 10px 0; }
.detail strong { display: inline-block; width: 100px; }
.btn-container { margin-top: 25px; }
.button-cancel { display: inline-block; padding: 10px 18px; background-color: #ef4444; color: #ffffff !important; text-decoration: none; margin-right: 10px; border-radius: 4px; font-weight: bold; }
.button-dashboard { display: inline-block; padding: 10px 18px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2 style="margin:0;">📅 Neuer Termin gebucht</h2>
</div>
<div class="content">
<p>Hallo <strong>${expertName}</strong>,</p>
<p>es wurde ein neuer Termin bei Ihnen gebucht:</p>
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Kunde:</strong> ${booking.customerName || 'Nicht angegeben'}</div>
<div class="detail"><strong>E-Mail:</strong> ${booking.customerEmail || 'Nicht angegeben'}</div>
<div class="detail"><strong>Telefon:</strong> ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Ort:</strong> ${location}</div>
<p style="margin-top: 20px;">Ein Kalendereintrag (iCal) ist dieser E-Mail beigefügt.</p>
<div class="btn-container">
    <a href="${providerCancelUrl}" class="button-cancel">Termin absagen</a>
    <a href="${providerDashboardUrl}" class="button-dashboard">Zum Dashboard</a>
</div>
</div>
</div>
</body>
</html>`;

                const expertText = `Neuer Termin gebucht\n\nHallo ${expertName},\n\nes wurde ein neuer Termin bei Ihnen gebucht.\n\nThema: ${topicTitle}\nKunde: ${booking.customerName || 'Nicht angegeben'}\nE-Mail: ${booking.customerEmail || 'Nicht angegeben'}\nTelefon: ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}\nZeit: ${formattedDate}\nOrt: ${location}\n\nTermin absagen: ${providerCancelUrl}\nDashboard: ${providerDashboardUrl}`;

                await transporter.sendMail({
                    from: fromAddress,
                    to: expertEmail,
                    subject: `📅 Neuer Termin gebucht: ${topicTitle} mit ${booking.customerName || 'Kunde'}`,
                    text: expertText,
                    html: expertHtml,
                    icalEvent: {
                        filename: 'termin.ics',
                        method: 'REQUEST',
                        content: icalString
                    }
                });
                console.log('[MailService] Confirmation notice sent to expert:', expertEmail);
            }
        } catch (error) {
            console.error('[MailService] sendConfirmation FAILED:', error);
        }
    },

    sendCancellation: async (booking, options = {}) => {
        console.log('[MailService] sendCancellation started for booking:', booking.id, 'options:', options);
        try {
            const { transporter, fromAddress } = await getTransporter();

            const fullBooking = await Booking.findByPk(booking.id, {
                include: [
                    { model: Topic },
                    { model: User, as: 'Provider' }
                ]
            });
            const expertEmail = fullBooking?.Provider?.email;
            const expertName = fullBooking?.Provider?.displayName || 'Anbieter';
            const topicTitle = fullBooking?.Topic?.title || 'Termin';
            const providerId = fullBooking?.providerId || fullBooking?.Topic?.userId;
            const topicId = fullBooking?.Topic?.id;
            const location = fullBooking?.Provider?.location || 'Keine Angabe';

            // Fetch app_url for direct rebooking link
            const globalSettingsList = await GlobalSettings.findAll();
            const config = {};
            globalSettingsList.forEach(setting => {
                config[setting.key] = setting.value;
            });
            const rawAppUrl = config.app_url || 'https://cloud.mso-hef.de/termin';
            const appUrl = rawAppUrl.replace(/\/$/, '');

            // Build direct rebooking URL
            let rebookUrl = appUrl;
            if (providerId && topicId) {
                rebookUrl = `${appUrl}/#/book/${providerId}?topic=${topicId}`;
            } else if (providerId) {
                rebookUrl = `${appUrl}/#/book/${providerId}`;
            }

            const formattedDate = formatGermanDate(booking.slotStartTime);

            // Determine who cancelled
            let cancelledBy = options.cancelledBy;
            const reasonType = options.reasonType;
            const customReason = options.customReason || booking.cancellationReason || '';

            if (!cancelledBy) {
                if (['wrongly_booked', 'wrong_date_time', 'sick_customer'].includes(reasonType)) {
                    cancelledBy = 'customer';
                } else if (['no_show'].includes(reasonType)) {
                    cancelledBy = 'provider';
                } else {
                    cancelledBy = 'customer';
                }
            }

            if (cancelledBy === 'customer') {
                // Determine Customer reason label
                let reasonLabel = 'Storniert durch Kunde';
                if (reasonType === 'wrongly_booked') {
                    reasonLabel = 'Fälschlicherweise gebucht';
                } else if (reasonType === 'wrong_date_time') {
                    reasonLabel = 'Falsches Datum / Uhrzeit gewählt';
                } else if (reasonType === 'sick_customer' || reasonType === 'sick') {
                    reasonLabel = 'Krank';
                } else if (reasonType === 'other') {
                    reasonLabel = customReason ? `Sonstiges: ${customReason}` : 'Sonstige Gründe';
                } else if (booking.cancellationReason) {
                    reasonLabel = booking.cancellationReason;
                }

                // 1. Send confirmation to Customer
                if (booking.customerEmail && booking.customerEmail.trim()) {
                    const custSubject = `✓ Termin erfolgreich storniert: ${topicTitle}`;
                    const custHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.header { background-color: #64748b; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
.content { background-color: #ffffff; padding: 20px; }
.detail-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 15px 0; }
.detail { margin: 8px 0; }
.btn-container { text-align: center; margin: 25px 0; }
.btn { background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2 style="margin:0;">✓ Termin storniert</h2>
</div>
<div class="content">
<p>Hallo <strong>${booking.customerName || 'Kunde'}</strong>,</p>
<p>Ihr vereinbarter Termin wurde wie gewünscht storniert.</p>
<div class="detail-box">
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Experte:</strong> ${expertName}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Grund der Absage:</strong> ${reasonLabel}</div>
</div>

<p>Möchten Sie zu einem anderen Zeitpunkt einen neuen Termin buchen? Über folgenden Link können Sie direkt einen passenden Slot wählen:</p>
<div class="btn-container">
<a href="${rebookUrl}" class="btn" target="_blank">Neuen Termin vereinbaren</a>
</div>
</div>
</div>
</body>
</html>`;
                    const custText = `Termin storniert\n\nHallo ${booking.customerName || 'Kunde'},\n\nIhr vereinbarter Termin wurde wie gewünscht storniert.\n\nThema: ${topicTitle}\nExperte: ${expertName}\nZeit: ${formattedDate}\nGrund: ${reasonLabel}\n\nNeuen Termin vereinbaren:\n${rebookUrl}`;

                    await transporter.sendMail({
                        from: fromAddress,
                        to: booking.customerEmail,
                        subject: custSubject,
                        text: custText,
                        html: custHtml
                    });
                    console.log('[MailService] Customer cancellation confirmation sent to:', booking.customerEmail);
                }

                // 2. Send notification to Expert
                if (expertEmail && expertEmail.trim()) {
                    const expertSubject = `✗ Termin abgesagt durch Kunde: ${topicTitle} (${booking.customerName || 'Kunde'})`;
                    const expertHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
.content { background-color: #ffffff; padding: 20px; }
.detail-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 15px 0; }
.detail { margin: 8px 0; }
.btn-container { text-align: center; margin: 25px 0; }
.btn { background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2 style="margin:0;">✗ Termin durch Kunden abgesagt</h2>
</div>
<div class="content">
<p>Hallo <strong>${expertName}</strong>,</p>
<p>der Kunde <strong>${booking.customerName || 'Kunde'}</strong> hat den folgenden Termin abgesagt:</p>
<div class="detail-box">
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Kunde:</strong> ${booking.customerName || 'Nicht angegeben'}</div>
<div class="detail"><strong>E-Mail:</strong> ${booking.customerEmail || 'Nicht angegeben'}</div>
<div class="detail"><strong>Telefon:</strong> ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Ort:</strong> ${location}</div>
<div class="detail"><strong>Grund der Absage:</strong> ${reasonLabel}</div>
</div>
<p>Der gebuchte Zeitslot ist automatisch wieder freigegeben worden.</p>
<div class="btn-container">
<a href="${appUrl}/#/dashboard/appointments" class="btn" target="_blank">Zu meinen Terminen</a>
</div>
</div>
</div>
</body>
</html>`;
                    const expertText = `Termin durch Kunden abgesagt\n\nHallo ${expertName},\n\nder Kunde ${booking.customerName || 'Kunde'} hat den folgenden Termin abgesagt:\n\nThema: ${topicTitle}\nKunde: ${booking.customerName || 'Nicht angegeben'}\nE-Mail: ${booking.customerEmail || 'Nicht angegeben'}\nTelefon: ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}\nZeit: ${formattedDate}\nOrt: ${location}\nGrund: ${reasonLabel}\n\nDashboard: ${appUrl}/#/dashboard/appointments`;

                    await transporter.sendMail({
                        from: fromAddress,
                        to: expertEmail,
                        subject: expertSubject,
                        text: expertText,
                        html: expertHtml
                    });
                    console.log('[MailService] Customer cancellation notice sent to expert:', expertEmail);
                }

            } else {
                // Provider cancellation
                let subject = `✗ Termin storniert: ${topicTitle}`;
                let headline = `✗ Termin storniert`;
                let reasonLabel = 'Absage durch Anbieter';
                let mainMessageHtml = `<p>Der folgende Termin wurde storniert:</p>`;
                let mainMessageText = `Der folgende Termin wurde storniert:\n\n`;

                if (reasonType === 'no_show') {
                    subject = `Terminstornierung: Sie sind nicht zum Termin erschienen (${topicTitle})`;
                    headline = `Sie sind nicht zum Termin erschienen`;
                    reasonLabel = `Kunde ist nicht zum Termin erschienen`;
                    mainMessageHtml = `<p>Hallo <strong>${booking.customerName || 'Kunde'}</strong>,</p><p>Sie sind zum vereinbarten Termin am <strong>${formattedDate}</strong> leider nicht erschienen.</p>`;
                    mainMessageText = `Hallo ${booking.customerName || 'Kunde'},\n\nSie sind zum vereinbarten Termin am ${formattedDate} leider nicht erschienen.\n\n`;
                } else if (reasonType === 'sick') {
                    subject = `Terminstornierung: Krankheitsbedingte Absage (${topicTitle})`;
                    headline = `Krankheitsbedingte Absage`;
                    reasonLabel = `Anbieter ist leider krank`;
                    mainMessageHtml = `<p>Hallo <strong>${booking.customerName || 'Kunde'}</strong>,</p><p>der vereinbarte Termin am <strong>${formattedDate}</strong> musste leider krankheitsbedingt durch <strong>${expertName}</strong> abgesagt werden. Wir bitten die Unannehmlichkeiten zu entschuldigen.</p>`;
                    mainMessageText = `Hallo ${booking.customerName || 'Kunde'},\n\nder vereinbarte Termin am ${formattedDate} musste leider krankheitsbedingt durch ${expertName} abgesagt werden. Wir bitten die Unannehmlichkeiten zu entschuldigen.\n\n`;
                } else if (customReason) {
                    subject = `Terminstornierung: ${topicTitle}`;
                    headline = `Termin abgesagt`;
                    reasonLabel = customReason;
                    mainMessageHtml = `<p>Hallo <strong>${booking.customerName || 'Kunde'}</strong>,</p><p>der vereinbarte Termin am <strong>${formattedDate}</strong> wurde durch <strong>${expertName}</strong> abgesagt.</p><p><strong>Begründung:</strong> ${customReason}</p>`;
                    mainMessageText = `Hallo ${booking.customerName || 'Kunde'},\n\nder vereinbarte Termin am ${formattedDate} wurde abgesagt.\nBegründung: ${customReason}\n\n`;
                }

                // 1. Send to Customer
                if (booking.customerEmail && booking.customerEmail.trim()) {
                    const custHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
.content { background-color: #ffffff; padding: 20px; }
.detail-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 15px 0; }
.detail { margin: 8px 0; }
.btn-container { text-align: center; margin: 25px 0; }
.btn { background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2 style="margin:0;">${headline}</h2>
</div>
<div class="content">
${mainMessageHtml}
<div class="detail-box">
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Experte:</strong> ${expertName}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Grund/Status:</strong> ${reasonLabel}</div>
</div>

<p>Möchten Sie einen neuen Termin vereinbaren? Über den folgenden Link können Sie schnell und direkt einen neuen Termin buchen:</p>
<div class="btn-container">
<a href="${rebookUrl}" class="btn" target="_blank">Neuen Termin vereinbaren</a>
</div>
</div>
</div>
</body>
</html>`;
                    const custText = `${headline}\n\n${mainMessageText}Termindetails:\n- Thema: ${topicTitle}\n- Experte: ${expertName}\n- Zeit: ${formattedDate}\n- Grund/Status: ${reasonLabel}\n\nNeuen Termin vereinbaren:\n${rebookUrl}`;

                    await transporter.sendMail({
                        from: fromAddress,
                        to: booking.customerEmail,
                        subject: subject,
                        text: custText,
                        html: custHtml
                    });
                    console.log('[MailService] Provider cancellation sent to customer:', booking.customerEmail);
                }

                // 2. Send confirmation to Expert
                if (expertEmail && expertEmail.trim()) {
                    const expertSubject = `✓ Stornierung bestätigt: ${topicTitle} (${booking.customerName || 'Kunde'})`;
                    const expertHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.header { background-color: #64748b; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
.content { background-color: #ffffff; padding: 20px; }
.detail-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 15px 0; }
.detail { margin: 8px 0; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2 style="margin:0;">✓ Termin storniert</h2>
</div>
<div class="content">
<p>Hallo <strong>${expertName}</strong>,</p>
<p>Sie haben den folgenden Termin storniert. Der Kunde (${booking.customerEmail}) wurde per E-Mail benachrichtigt.</p>
<div class="detail-box">
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Kunde:</strong> ${booking.customerName || 'Nicht angegeben'}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Grund/Status:</strong> ${reasonLabel}</div>
</div>
</div>
</div>
</body>
</html>`;
                    const expertText = `Stornierung bestätigt\n\nHallo ${expertName},\n\nSie haben folgenden Termin storniert:\n\nThema: ${topicTitle}\nKunde: ${booking.customerName || 'Nicht angegeben'} (${booking.customerEmail})\nZeit: ${formattedDate}\nGrund: ${reasonLabel}`;

                    await transporter.sendMail({
                        from: fromAddress,
                        to: expertEmail,
                        subject: expertSubject,
                        text: expertText,
                        html: expertHtml
                    });
                    console.log('[MailService] Cancellation confirmation sent to expert:', expertEmail);
                }
            }
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
            const location = fullBooking?.Provider?.location || 'Keine Angabe';
            const expertEmail = fullBooking?.Provider?.email;
            const customerEmail = booking.customerEmail;

            const formattedDate = formatGermanDate(booking.slotStartTime);

            // 1. Send reminder to Customer
            if (customerEmail && customerEmail.trim() !== '') {
                const custHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
.content { background-color: #f9f9f9; padding: 20px; }
.detail { margin: 10px 0; }
.alert { background-color: #fff3cd; padding: 15px; border-left: 4px solid #FF9800; margin-bottom: 20px; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2 style="margin:0;">🔔 Terminerinnerung</h2>
</div>
<div class="content">
<div class="alert">
<strong>Ihr Termin beginnt in ${leadTime} Minuten!</strong>
</div>
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Experte:</strong> ${expertName}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Ort:</strong> ${location}</div>
<div class="detail"><strong>Name:</strong> ${booking.customerName || 'Nicht angegeben'}</div>
<div class="detail"><strong>E-Mail:</strong> ${booking.customerEmail || 'Nicht angegeben'}</div>
<div class="detail"><strong>Telefon:</strong> ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}</div>
</div>
</div>
</body>
</html>`;

                const custText = `🔔 Terminerinnerung\n\nIhr Termin beginnt in ${leadTime} Minuten!\n\nThema: ${topicTitle}\nExperte: ${expertName}\nZeit: ${formattedDate}\nOrt: ${location}\nName: ${booking.customerName || 'Nicht angegeben'}\nE-Mail: ${booking.customerEmail || 'Nicht angegeben'}\nTelefon: ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}`;

                await transporter.sendMail({
                    from: fromAddress,
                    to: customerEmail,
                    subject: `🔔 Erinnerung: Termin in ${leadTime} Minuten (${topicTitle})`,
                    text: custText,
                    html: custHtml
                });
                console.log('[MailService] Reminder sent to customer:', customerEmail);
            }

            // 2. Send reminder to Expert
            if (expertEmail && expertEmail.trim() !== '') {
                const expHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
.header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
.content { background-color: #f9f9f9; padding: 20px; }
.detail { margin: 10px 0; }
.alert { background-color: #dbeafe; padding: 15px; border-left: 4px solid #2563eb; margin-bottom: 20px; color: #1e40af; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h2 style="margin:0;">🔔 Terminerinnerung</h2>
</div>
<div class="content">
<div class="alert">
<strong>Termin mit ${booking.customerName || 'Kunde'} beginnt in ${leadTime} Minuten!</strong>
</div>
<div class="detail"><strong>Thema:</strong> ${topicTitle}</div>
<div class="detail"><strong>Kunde:</strong> ${booking.customerName || 'Nicht angegeben'}</div>
<div class="detail"><strong>E-Mail:</strong> ${booking.customerEmail || 'Nicht angegeben'}</div>
<div class="detail"><strong>Telefon:</strong> ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}</div>
<div class="detail"><strong>Zeit:</strong> ${formattedDate}</div>
<div class="detail"><strong>Ort:</strong> ${location}</div>
</div>
</div>
</body>
</html>`;

                const expText = `🔔 Terminerinnerung\n\nTermin mit ${booking.customerName || 'Kunde'} beginnt in ${leadTime} Minuten!\n\nThema: ${topicTitle}\nKunde: ${booking.customerName || 'Nicht angegeben'}\nE-Mail: ${booking.customerEmail || 'Nicht angegeben'}\nTelefon: ${(booking.customerPhone && booking.customerPhone.trim()) ? booking.customerPhone.trim() : 'Keine Angabe'}\nZeit: ${formattedDate}\nOrt: ${location}`;

                await transporter.sendMail({
                    from: fromAddress,
                    to: expertEmail,
                    subject: `🔔 Erinnerung: Termin in ${leadTime} Minuten mit ${booking.customerName || 'Kunde'}`,
                    text: expText,
                    html: expHtml
                });
                console.log('[MailService] Reminder sent to expert:', expertEmail);
            }
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

            const globalSettingsList = await GlobalSettings.findAll();
            const config = {};
            globalSettingsList.forEach(setting => {
                config[setting.key] = setting.value;
            });
            const rawAppUrl = config.app_url || 'https://cloud.mso-hef.de/termin';
            const appUrl = rawAppUrl.replace(/\/$/, '');

            // Build HTML table
            let htmlRows = '';
            let textRows = '';

            fullBookings.forEach(booking => {
                const topicTitle = booking?.Topic?.title || 'Termin';
                const expertName = booking?.Provider?.displayName || 'Experte';
                const location = booking?.Provider?.location || 'Keine Angabe';
                const formattedDate = formatGermanDate(booking.slotStartTime);
                const cancelUrl = `${appUrl}/#/cancel/${booking.cancellationToken}?role=customer`;

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
<h2 style="margin:0;">📅 Ihre gebuchten Termine</h2>
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
