// Prefer spaces and existing hyphens; split oversized words only as a fallback.
export function wrapBadgeText(text, width, measure) {
    const lines = [];
    let line = '';
    for (let word of text.trim().split(/\s+/).filter(Boolean)) {
        const joined = line ? `${line} ${word}` : word;
        if (measure(joined) <= width) { line = joined; continue; }
        if (measure(word) <= width) {
            if (line) lines.push(line);
            line = word;
            continue;
        }
        while (word) {
            const prefix = line ? `${line} ` : '';
            if (measure(prefix + word) <= width) { line = prefix + word; break; }
            const chars = Array.from(word);
            let cut = 0;
            // A compound surname keeps its original hyphen at the end of the line.
            for (let i = 1; i < chars.length; i++) {
                if (chars[i - 1] === '-' && measure(prefix + chars.slice(0, i).join('')) <= width) cut = i;
            }
            if (!cut && line) { lines.push(line); line = ''; continue; }
            if (!cut) {
                for (let i = 1; i < chars.length; i++) {
                    if (measure(chars.slice(0, i).join('') + '-') <= width) cut = i;
                }
            }
            if (!cut) throw new Error('Der Textbereich ist für einzelne Buchstaben zu schmal. Bitte den Abstand zwischen QR-Code und Text verkleinern.');
            const part = chars.slice(0, cut).join('');
            lines.push(prefix + part + (part.endsWith('-') ? '' : '-'));
            word = chars.slice(cut).join(''); line = '';
        }
    }
    if (line) lines.push(line);
    return lines;
}

export function placeBadgeText({ nameLines, positionLines, nameSize, positionSize, gap, rowY, qrSize, top, bottom }) {
    // Preserve the usual spacing where possible; long names can use the free
    // space above the QR code, below the logo, without changing font sizes.
    for (const leading of [1.2, 1.05]) {
        const nameStep = nameSize * leading, positionStep = positionSize * leading;
        const total = nameLines * nameStep + (positionLines ? gap : 0) + positionLines * positionStep;
        const preferred = rowY + Math.max(0, (qrSize - total) / 2);
        const y = Math.max(top, Math.min(preferred, bottom - total));
        if (y + total <= bottom + 1e-8) return { y, nameStep, positionStep };
    }
    throw new Error('Der umgebrochene Text benötigt mehr Platz zwischen Logo und Unterrand. Bitte für dieses Schild einen kürzeren Zusatz wählen oder den Textbereich in den Einstellungen vergrößern.');
}
