import { useEffect, useState } from 'react';
import api from '../api';
import { renderBadge } from '../lib/nameBadge';
import { layoutBadgeSheets, downloadBadgeSheets, printBadgeSheets } from '../lib/badgeSheets';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

export default function BulkNameBadges({ users }) {
    const [result, setResult] = useState(null);
    const [progress, setProgress] = useState(0);
    const [busy, setBusy] = useState(false);
    const [options, setOptions] = useState({ left: 5, top: 10, gapX: 3, gapY: 3, landscape: false });
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data: settings } = await api.get('/name-badges/settings');
                const images = [], inactive = [];
                for (const user of users) {
                    if (!active) return;
                    try {
                        const { data: person } = await api.get(`/name-badges/users/${user.id}`);
                        images.push(await renderBadge(settings, person));
                        if (!person.bookingPageActive) inactive.push(person.displayName);
                    } catch (e) { throw new Error(`${user.displayName}: ${e.response?.data?.error || e.message}`); }
                    if (active) setProgress(images.length);
                }
                if (active) setResult({ settings, images, inactive });
            } catch (e) { if (active) setResult({ error: e.message }); }
        })();
        return () => { active = false; };
    }, [users]);
    let layout, error = result?.error;
    if (result?.settings) {
        try { layout = layoutBadgeSheets(users.length, result.settings, options); }
        catch (e) { error = e.message; }
    }
    const run = async fn => {
        setBusy(true);
        try { await fn(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
    };
    return <div className="space-y-4 min-w-0">
        <p className="text-sm text-muted-foreground">{users.length} Namensschilder · Gespeicherte Anrede und Zusätze werden übernommen. Startposition und Abstände gelten auf jeder Seite.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[['left', 'Start links (mm)'], ['top', 'Start oben (mm)'], ['gapX', 'Abstand horizontal (mm)'], ['gapY', 'Abstand vertikal (mm)']].map(([key, label]) => <label key={key} className="text-sm space-y-1">{label}<Input type="number" min="0" step="0.5" value={options[key]} onChange={e => setOptions({ ...options, [key]: e.target.value })} /></label>)}
        </div>
        <label className="block text-sm">Papierformat<select className="block rounded border p-2 bg-background mt-1" value={options.landscape ? 'landscape' : 'portrait'} onChange={e => setOptions({ ...options, landscape: e.target.value === 'landscape' })}><option value="portrait">A4 Hochformat</option><option value="landscape">A4 Querformat</option></select></label>
        {!result && <p role="status">Schilder werden vorbereitet: {progress} / {users.length} …</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {result?.inactive?.length > 0 && <details className="rounded bg-amber-50 text-amber-900 p-3 text-sm"><summary>{result.inactive.length} Buchungsseiten sind deaktiviert</summary><p>Die QR-Codes dieser Personen führen aktuell zu keiner aktiven Buchungsseite: {result.inactive.join(', ')}</p></details>}
        {layout && <>
            <p className="text-sm">{layout.pages.length} Seite(n) · {layout.columns} Spalte(n) × {layout.rows} Zeile(n) pro Blatt · Schild {Number(layout.width.toFixed(2))} × {Number(layout.height.toFixed(2))} mm</p>
            <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => run(() => printBadgeSheets(result.images, layout))}>Alle Seiten drucken</Button><Button variant="outline" disabled={busy} onClick={() => run(() => downloadBadgeSheets(result.images, layout))}>PDF herunterladen</Button></div>
            <p className="text-xs text-muted-foreground">Drucken mit 100 % / „Tatsächliche Größe“, ohne Kopf-/Fußzeilen. Die Druckkorrektur aus den Namensschild-Einstellungen ist berücksichtigt. Bei kleinen Randabständen muss der Drucker randlosen Druck unterstützen.</p>
            <div className="bg-slate-100 rounded p-3 space-y-5 max-h-[55vh] overflow-y-auto" aria-label="Livevorschau der Druckseiten">
                {layout.pages.map((page, i) => <figure key={i} className="mx-auto max-w-[650px]"><figcaption className="text-sm text-slate-700 mb-2">Seite {i + 1}</figcaption><div className="relative bg-white shadow overflow-hidden" style={{ aspectRatio: `${layout.pageWidth} / ${layout.pageHeight}` }}>
                    {page.map(cell => <img key={cell.index} src={result.images[cell.index]} alt={`Namensschild ${users[cell.index].displayName}`} className="absolute" style={{ left: `${cell.x / layout.pageWidth * 100}%`, top: `${cell.y / layout.pageHeight * 100}%`, width: `${layout.width / layout.pageWidth * 100}%`, height: `${layout.height / layout.pageHeight * 100}%` }} />)}
                </div></figure>)}
            </div>
        </>}
    </div>;
}
