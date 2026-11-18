// All measurements are millimetres. Preview, PDF and print share these positions.
export function layoutBadgeSheets(count, settings, options) {
    const pageWidth = options.landscape ? 297 : 210;
    const pageHeight = options.landscape ? 210 : 297;
    const factor = Number(settings.printScale) / 100;
    const width = Number(settings.width) * factor, height = Number(settings.height) * factor;
    const values = ['left', 'top', 'gapX', 'gapY'].map(key => options[key] === '' ? NaN : Number(options[key]));
    if (values.some(n => !Number.isFinite(n) || n < 0)) throw new Error('Startposition und Abstände müssen gültige Zahlen ab 0 mm sein.');
    if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new Error('Die Schildmaße sind ungültig.');
    const [left, top, gapX, gapY] = values;
    const columns = Math.floor((pageWidth - left + gapX + 1e-8) / (width + gapX));
    const rows = Math.floor((pageHeight - top + gapY + 1e-8) / (height + gapY));
    if (columns < 1 || rows < 1) throw new Error('Mit dieser Startposition passt kein Schild auf das Blatt. Bitte Startposition oder Schildgröße verkleinern.');
    const perPage = columns * rows;
    const pages = [];
    for (let index = 0; index < count; index++) {
        const page = Math.floor(index / perPage), cell = index % perPage;
        if (!pages[page]) pages[page] = [];
        pages[page].push({ index, x: left + (cell % columns) * (width + gapX), y: top + Math.floor(cell / columns) * (height + gapY) });
    }
    return { pages, pageWidth, pageHeight, width, height, columns, rows };
}

export async function downloadBadgeSheets(images, layout) {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: layout.pageWidth > layout.pageHeight ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    pdf.viewerPreferences({ PrintScaling: 'None' });
    layout.pages.forEach((page, i) => {
        if (i) pdf.addPage();
        page.forEach(cell => pdf.addImage(images[cell.index], 'PNG', cell.x, cell.y, layout.width, layout.height));
    });
    pdf.save('Namensschilder_A4.pdf');
}

export function printBadgeSheets(images, layout) {
    const win = window.open('', '_blank');
    if (!win) throw new Error('Bitte Pop-ups für den Druck erlauben.');
    win.document.write(`<!doctype html><html lang="de"><head><title>Namensschilder – A4</title><style>
    @page{size:${layout.pageWidth}mm ${layout.pageHeight}mm;margin:0}html,body{margin:0;padding:0}
    .sheet{position:relative;width:${layout.pageWidth}mm;height:${layout.pageHeight}mm;overflow:hidden;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}
    img{position:absolute;display:block;max-width:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .hint{padding:12px;font:14px Arial;background:#eef2ff}@media print{.hint{display:none}}
    </style></head><body><div class="hint">A4 · Tatsächliche Größe / 100 % · keine Kopf-/Fußzeilen. <button onclick="window.print()">Drucken</button></div></body></html>`);
    win.document.close();
    const pending = [];
    for (const page of layout.pages) {
        const sheet = win.document.createElement('div'); sheet.className = 'sheet'; win.document.body.appendChild(sheet);
        for (const cell of page) {
            const img = win.document.createElement('img'); img.alt = 'Namensschild';
            img.style.cssText = `left:${cell.x}mm;top:${cell.y}mm;width:${layout.width}mm;height:${layout.height}mm`;
            pending.push(new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; }));
            sheet.appendChild(img); img.src = images[cell.index];
        }
    }
    Promise.all(pending).then(() => { if (!win.closed) { win.focus(); win.print(); } }).catch(() => { if (!win.closed) win.document.querySelector('.hint').textContent = 'Bilder konnten nicht geladen werden. Bitte Druckfenster schließen und erneut versuchen.'; });
}
