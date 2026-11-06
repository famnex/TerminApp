const defaults = {
    width: 90, height: 60, logo: '', logoWidth: 70, logoTop: 4, logoOffsetX: 0, logoAlign: 'center',
    contentTop: 30, margin: 4, qrSize: 22, textGap: 4,
    nameFontSize: 18, positionFontSize: 12, lineGap: 2,
    nameColor: '#111111', positionColor: '#153a58', qrColor: '#000000',
    borderColor: '#777777', borderWidth: 0.2, printScale: 100
};
const ranges = {
    width: [40, 200], height: [40, 200], logoWidth: [5, 190], logoTop: [0, 190], logoOffsetX: [-190, 190],
    contentTop: [0, 190], margin: [1, 20], qrSize: [15, 80], textGap: [1, 30],
    nameFontSize: [6, 60], positionFontSize: [6, 48], lineGap: [0, 20],
    borderWidth: [0.1, 2], printScale: [50, 150]
};
function validateLayout(input) {
    const value = { ...defaults };
    for (const [key, [min, max]] of Object.entries(ranges)) {
        const n = input[key] === undefined ? defaults[key] : input[key];
        if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw new Error(`${key}: Wert muss zwischen ${min} und ${max} liegen.`);
        value[key] = n;
    }
    for (const key of ['nameColor', 'positionColor', 'qrColor', 'borderColor']) {
        const color = input[key] === undefined ? defaults[key] : input[key];
        if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Bitte gültige Farben wählen.');
        value[key] = color;
    }
    const rgb = value.qrColor.match(/[0-9a-f]{2}/gi).map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    if (1.05 / (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 + 0.05) < 4.5) throw new Error('Die QR-Code-Farbe muss auf Weiß ausreichend dunkel sein.');
    value.logoAlign = input.logoAlign === undefined ? defaults.logoAlign : input.logoAlign;
    if (!['left', 'center', 'right'].includes(value.logoAlign)) throw new Error('Ungültige Logo-Position.');
    value.logo = input.logo ?? '';
    if (typeof value.logo !== 'string' || (value.logo && !/^uploads\/badge-[a-f0-9-]+\.(png|jpg)$/.test(value.logo))) throw new Error('Bitte ein Namensschild-Logo hochladen.');
    if (value.logo && value.logoWidth > value.width - 2 * value.margin) throw new Error('Das Logo ist breiter als die nutzbare Schildfläche.');
    const logoX = (value.logoAlign === 'left' ? value.margin : value.logoAlign === 'right' ? value.width - value.margin - value.logoWidth : (value.width - value.logoWidth) / 2) + value.logoOffsetX;
    if (value.logo && (logoX < 0 || logoX + value.logoWidth > value.width)) throw new Error('Die horizontale Logo-Position liegt außerhalb des Schildes.');
    if (value.contentTop < value.margin) throw new Error('Der QR-/Textbereich muss unterhalb des Randes beginnen.');
    if (value.contentTop + value.qrSize > value.height - value.margin || value.width - 2 * value.margin - value.qrSize - value.textGap < 10) throw new Error('QR-Code und Text passen mit diesen Abständen nicht auf das Schild.');
    if (value.width * value.printScale / 100 > 200 || value.height * value.printScale / 100 > 277) throw new Error('Das korrigierte Druckformat passt nicht auf A4.');
    return value;
}
module.exports = { defaults, ranges, validateLayout };
