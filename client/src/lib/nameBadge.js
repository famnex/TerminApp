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

// Canvas units are millimetres; font sizes are entered in typographic points.
export async function renderBadge(settings, person) {
    const scale = 300 / 25.4;
    const n = key => Number(settings[key]);
    const w = n('width'), h = n('height'), pad = n('margin');
    const numberKeys = ['width', 'height', 'margin', 'logoWidth', 'logoTop', 'logoOffsetX', 'contentTop', 'qrSize', 'textGap', 'nameFontSize', 'positionFontSize', 'lineGap', 'borderWidth', 'printScale'];
    if (numberKeys.some(key => settings[key] === '' || !Number.isFinite(n(key)))) throw new Error('Bitte alle Größen vollständig eingeben.');
    if (w < 40 || h < 40 || w > 200 || h > 200 || pad < 1 || n('qrSize') < 15 || n('nameFontSize') < 6 || n('positionFontSize') < 6 || n('borderWidth') < 0.1 || n('printScale') < 50 || n('printScale') > 150) throw new Error('Bitte gültige Maße und Schriftgrößen wählen.');
    if (w * n('printScale') / 100 > 200 || h * n('printScale') / 100 > 277) throw new Error('Das korrigierte Druckformat passt nicht auf A4.');
    for (const key of ['nameColor', 'positionColor', 'qrColor', 'borderColor']) {
        if (!/^#[0-9a-f]{6}$/i.test(settings[key])) throw new Error('Bitte gültige Farben wählen.');
    }
    const rgb = settings.qrColor.match(/[0-9a-f]{2}/gi).map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    if (1.05 / (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 + 0.05) < 4.5) throw new Error('Die QR-Code-Farbe muss auf Weiß ausreichend dunkel sein.');
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    const rowY = n('contentTop'), qrSize = n('qrSize');
    if (rowY < pad || rowY + qrSize > h - pad) throw new Error('Der QR-Code liegt außerhalb der Schildfläche. Bitte Größe oder Abstand von oben reduzieren.');
    if (settings.logo) {
        const logo = await loadImage(new URL(settings.logo, window.location.href).href);
        const lw = n('logoWidth'), lh = lw * logo.height / logo.width;
        if (lw <= 0 || lw > w - pad * 2 || n('logoTop') < 0 || n('logoTop') + lh > rowY) throw new Error('Das Logo passt nicht in den oberen Bereich. Bitte die Logo-Breite verkleinern oder den QR-/Textbereich nach unten verschieben.');
        const lx = (settings.logoAlign === 'left' ? pad : settings.logoAlign === 'right' ? w - pad - lw : (w - lw) / 2) + n('logoOffsetX');
        if (lx < 0 || lx + lw > w) throw new Error('Die horizontale Logo-Position liegt außerhalb des Schildes.');
        ctx.drawImage(logo, lx, n('logoTop'), lw, lh);
    }
    const qr = await QRCode.toCanvas(bookingUrl(settings.appUrl, person.id), {
        errorCorrectionLevel: 'M', margin: 4, scale: 10,
        color: { dark: settings.qrColor, light: '#ffffff' }
    });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, pad, rowY, qrSize, qrSize);
    const x = pad + qrSize + n('textGap'), available = w - pad - x;
    if (available < 10) throw new Error('Rechts neben dem QR-Code ist zu wenig Platz für den Text.');
    function linesFor(text, font) {
        ctx.font = font;
        const lines = []; let line = '';
        for (const word of text.trim().split(/\s+/)) {
            const candidate = line ? `${line} ${word}` : word;
            if (ctx.measureText(candidate).width <= available) { line = candidate; continue; }
            if (line) lines.push(line);
            line = '';
            for (const ch of word) {
                if (ctx.measureText(line + ch).width > available && line) { lines.push(line); line = ''; }
                line += ch;
            }
        }
        if (line) lines.push(line);
        return lines;
    }
    const nameSize = n('nameFontSize') * 25.4 / 72;
    const positionSize = n('positionFontSize') * 25.4 / 72;
    const nameFont = `bold ${nameSize}px Arial, sans-serif`, positionFont = `${positionSize}px Arial, sans-serif`;
    const names = linesFor(`${person.salutation} ${badgeSurname(person.displayName)}`, nameFont);
    const positions = linesFor(person.position || '', positionFont);
    const total = names.length * nameSize * 1.2 + n('lineGap') + positions.length * positionSize * 1.2;
    let y = rowY + Math.max(0, (qrSize - total) / 2);
    if (y + total > h - pad) throw new Error('Der Text passt nicht auf das Schild. Bitte kleinere Schriftgrößen oder einen kürzeren Zusatz wählen.');
    ctx.textBaseline = 'top'; ctx.fillStyle = settings.nameColor; ctx.font = nameFont;
    for (const line of names) { ctx.fillText(line, x, y); y += nameSize * 1.2; }
    y += n('lineGap'); ctx.fillStyle = settings.positionColor; ctx.font = positionFont;
    for (const line of positions) { ctx.fillText(line, x, y); y += positionSize * 1.2; }
    // Draw INSIDE the exact outer dimensions: the border never enlarges the badge.
    const border = n('borderWidth');
    ctx.strokeStyle = settings.borderColor; ctx.lineWidth = border;
    ctx.strokeRect(border / 2, border / 2, w - border, h - border);
    return canvas.toDataURL('image/png');
}
export function printBadge(image, settings, calibration = false) {
    const win = window.open('', '_blank');
    if (!win) throw new Error('Bitte Pop-ups für den Druck erlauben.');
    const factor = Number(settings.printScale) / 100;
    const width = Number(settings.width) * factor, height = Number(settings.height) * factor;
    win.document.write(`<!doctype html><html lang="de"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Namensschild – A4, 100 %</title><style>
        @page{size:210mm 297mm;margin:0}
        *{box-sizing:border-box}html,body{margin:0;padding:0;background:white}
        .sheet{width:210mm;height:297mm;padding:10mm 5mm;overflow:hidden}
        img{width:${width}mm;height:${height}mm;max-width:none;display:block;print-color-adjust:exact;-webkit-print-color-adjust:exact}
        .calibration{width:50mm;border:0;border-top:.2mm solid black;margin:6mm 0 0;font:9pt Arial}
        .hint{font:14px Arial;padding:12px;background:#eef2ff}button{margin-left:12px}
        @media print{.hint{display:none}}
    </style></head><body><div class="hint">A4 · 100 % / Tatsächliche Größe · keine Kopf-/Fußzeilen. Bildschirmdarstellung ist kein Maßstab.<button type="button" onclick="window.print()">Drucken</button></div><div class="sheet"></div></body></html>`);
    win.document.close();
    const img = win.document.createElement('img'); img.alt = 'Namensschild';
    img.onload = () => { win.focus(); win.print(); };
    win.document.querySelector('.sheet').appendChild(img);
    if (calibration) {
        const ruler = win.document.createElement('div'); ruler.className = 'calibration';
        ruler.textContent = 'Kontrollmaß: genau 50 mm'; win.document.querySelector('.sheet').appendChild(ruler);
    }
    img.src = image;
}
export async function downloadBadge(image, settings) {
    const { jsPDF } = await import('jspdf');
    const factor = Number(settings.printScale) / 100;
    // A4 prevents PDF viewers from expanding a tiny custom page to a full sheet.
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.viewerPreferences({ PrintScaling: 'None' });
    pdf.addImage(image, 'PNG', 5, 10, Number(settings.width) * factor, Number(settings.height) * factor);
    pdf.save('Namensschild_A4.pdf');
}
