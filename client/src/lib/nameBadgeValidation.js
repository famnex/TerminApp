export const badgeNumberRules = {
    width: ['Schildbreite', 40, 200, 'mm'], height: ['Schildhöhe', 40, 200, 'mm'],
    logoWidth: ['Logo-Breite', 5, 190, 'mm'], logoTop: ['Logo-Abstand oben', 0, 190, 'mm'],
    logoOffsetX: ['Logo horizontal verschieben', -190, 190, 'mm'],
    contentTop: ['QR-/Textbereich oben', 0, 190, 'mm'], margin: ['Seiten-/Unterrand', 1, 20, 'mm'],
    qrSize: ['QR-Code-Größe', 15, 80, 'mm'], textGap: ['Abstand QR → Text', 1, 30, 'mm'],
    nameFontSize: ['Name: Schriftgröße', 6, 60, 'pt'], positionFontSize: ['Zusatz: Schriftgröße', 6, 48, 'pt'],
    lineGap: ['Abstand Name → Zusatz', 0, 20, 'mm'], borderWidth: ['Rahmenstärke', 0.1, 2, 'mm'],
    printScale: ['Druckkorrektur', 50, 150, '%']
};
const format = value => String(value).replace('.', ',');
export function badgeNumberErrors(settings) {
    const errors = {};
    for (const [key, [label, min, max, unit]] of Object.entries(badgeNumberRules)) {
        const raw = settings[key];
        const range = `${format(min)}–${format(max)} ${unit}`;
        if (raw === null || raw === undefined || String(raw).trim() === '' || !Number.isFinite(Number(raw))) {
            errors[key] = `${label}: Bitte eine Zahl eingeben (erlaubt: ${range}).`;
        } else if (Number(raw) < min || Number(raw) > max) {
            errors[key] = `${label}: ${format(raw)} ${unit} ist nicht zulässig. Erlaubt sind ${range}.`;
        }
    }
    return errors;
}
