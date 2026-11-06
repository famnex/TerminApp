import QRCode from 'qrcode';

export const badgeSurname = name => (name || '').split(',')[0].trim();
export function bookingUrl(appUrl, id) {
    const base = new URL(appUrl || window.location.href);
    if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Die Anwendungs-URL muss mit https:// oder http:// beginnen.');
    base.search = '';
    base.hash = `/book/${encodeURIComponent(id)}`;
    return base.href;
}
const loadImage = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Das Logo konnte nicht geladen werden. Bitte das Logo in den Einstellungen prüfen.'));
    image.src = src;
});

// One 300 dpi artwork is used for preview, print and PDF so all three match.
export async function renderBadge(settings, person) {
    const scale = 300 / 25.4;
    const w = Number(settings.width), h = Number(settings.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    const pad = 3;
    const logoHeight = h * 0.32;
    if (settings.logo) {
        const logo = await loadImage(new URL(settings.logo, window.location.href).href);
        const ratio = Math.min((w - pad * 2) / logo.width, logoHeight / logo.height);
        const lw = logo.width * ratio, lh = logo.height * ratio;
        ctx.drawImage(logo, (w - lw) / 2, pad + (logoHeight - lh) / 2, lw, lh);
    }
    const rowY = pad + logoHeight + 3;
    const rowHeight = h - rowY - pad;
    const qrSize = Math.min(25, rowHeight, Math.max(18, w * 0.3));
    const qr = await QRCode.toCanvas(bookingUrl(settings.appUrl, person.id), { errorCorrectionLevel: 'M', margin: 4, scale: 10 });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, pad, rowY + (rowHeight - qrSize) / 2, qrSize, qrSize);
    const x = pad + qrSize + 2, available = w - pad - x;
    const name = `${person.salutation} ${badgeSurname(person.displayName)}`;
    function linesFor(text, font, maxWidth) {
        ctx.font = font;
        const lines = []; let line = '';
        for (const word of text.split(/\s+/)) {
            const candidate = line ? `${line} ${word}` : word;
            if (ctx.measureText(candidate).width <= maxWidth) { line = candidate; continue; }
            if (line) lines.push(line);
            line = '';
            for (const ch of word) {
                if (ctx.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ''; }
                line += ch;
            }
        }
        if (line) lines.push(line.trim());
        return lines;
    }
    let size = Math.min(5, h * 0.085), names, positions;
    do {
        names = linesFor(name, `bold ${size}px Arial`, available);
        positions = linesFor(person.position, `${size * 0.72}px Arial`, available);
        if ((names.length * 1.2 + positions.length * 0.9 + 0.6) * size <= rowHeight) break;
        size -= 0.1;
    } while (size >= 1.5);
    if (size < 1.5) throw new Error('Der Text ist für dieses Schild zu lang. Bitte den Zusatz kürzen oder größere Maße wählen.');
    const total = (names.length * 1.2 + positions.length * 0.9 + 0.6) * size;
    let y = rowY + (rowHeight - total) / 2;
    ctx.textBaseline = 'top'; ctx.fillStyle = '#111'; ctx.font = `bold ${size}px Arial`;
    for (const line of names) { ctx.fillText(line, x, y); y += size * 1.2; }
    y += size * 0.6; ctx.fillStyle = '#153a58'; ctx.font = `${size * 0.72}px Arial`;
    for (const line of positions) { ctx.fillText(line, x, y); y += size * 0.9; }
    return canvas.toDataURL('image/png');
}
export function printBadge(image, settings) {
    const win = window.open('', '_blank');
    if (!win) throw new Error('Bitte Pop-ups für den Druck erlauben.');
    win.document.write(`<!doctype html><html><head><title>Namensschild drucken</title><style>@page{size:A4;margin:10mm}body{margin:0}img{width:${Number(settings.width)}mm;height:${Number(settings.height)}mm;display:block;print-color-adjust:exact}</style></head><body></body></html>`);
    win.document.close();
    const img = win.document.createElement('img');
    img.alt = 'Namensschild';
    img.onload = () => { win.focus(); win.print(); };
    img.src = image; win.document.body.appendChild(img);
}
export async function downloadBadge(image, settings) {
    const { jsPDF } = await import('jspdf');
    const width = Number(settings.width), height = Number(settings.height);
    const pdf = new jsPDF({ orientation: width >= height ? 'landscape' : 'portrait', unit: 'mm', format: [width, height] });
    pdf.addImage(image, 'PNG', 0, 0, width, height);
    pdf.save('Namensschild.pdf');
}
