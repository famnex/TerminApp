/**
 * Parses a custom booking notice / message into phone, email, or text.
 * 
 * Rules:
 * - If it contains an '@', it's treated as an email address (with mailto: link).
 * - If it's a sequence of numbers (digits with optional spaces, slashes, dashes, parens, or phone prefix),
 *   it's treated as a telephone number (with tel: link).
 * - Otherwise, it's treated as an informative text message.
 */
export function parseBookingNotice(notice) {
    if (!notice || typeof notice !== 'string' || !notice.trim()) {
        return null;
    }
    const trimmed = notice.trim();

    // 1. Email check (@)
    if (trimmed.includes('@')) {
        const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch ? emailMatch[0] : trimmed;
        return {
            type: 'email',
            href: `mailto:${email}`,
            display: trimmed,
            target: email
        };
    }

    // 2. Phone check (Zahlenfolge)
    const digitsOnly = trimmed.replace(/\D/g, '');
    const lettersOnly = trimmed.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
    const isPhonePrefix = /^(tel(efon)?|mobil|phone|rufnummer|hotline)[\s.:]/i.test(trimmed);

    // If it has at least 3 digits and either no alphabetic letters or an explicit phone prefix (e.g. "Tel: ...")
    if (digitsOnly.length >= 3 && (lettersOnly.length === 0 || isPhonePrefix)) {
        const hasLeadingPlus = trimmed.startsWith('+');
        const cleanNumber = (hasLeadingPlus ? '+' : '') + digitsOnly;
        return {
            type: 'phone',
            href: `tel:${cleanNumber}`,
            display: trimmed,
            target: cleanNumber
        };
    }

    // 3. Fallback: text message
    return {
        type: 'text',
        href: null,
        display: trimmed
    };
}
