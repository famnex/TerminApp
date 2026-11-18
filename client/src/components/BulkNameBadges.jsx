import { useEffect, useRef, useState } from 'react';
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
    const [menu, setMenu] = useState(null);
    const menuRef = useRef(null);
    const triggerRef = useRef(null);
    useEffect(() => {
        if (!menu) return;
        menuRef.current?.querySelector('button[aria-pressed="true"]')?.focus();
        const close = event => {
            if (event.type === 'keydown' && event.key !== 'Escape') return;
            if (event.type === 'pointerdown' && (menuRef.current?.contains(event.target) || triggerRef.current?.contains(event.target))) return;
            setMenu(null);
            if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); triggerRef.current?.focus(); }
        };
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', close, true);
        return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close, true); };
    }, [menu]);
    const [options, setOptions] = useState({ left: 5, top: 10, gapX: 3, gapY: 3, landscape: false });
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data: settings } = await api.get('/name-badges/settings');
                const images = [], inactive = [], people = [];
                for (const user of users) {
                    if (!active) return;
                    try {
                        const { data: person } = await api.get(`/name-badges/users/${user.id}`);
                        images.push(await renderBadge(settings, person));
                        people.push(person);
                        if (!person.bookingPageActive) inactive.push(person.displayName);
                    } catch (e) { throw new Error(`${user.displayName}: ${e.response?.data?.error || e.message}`); }
                    if (active) setProgress(images.length);
                }
                if (active) setResult({ settings, images, inactive, people });
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
    const chooseSalutation = async salutation => {
        const index = menu.index;
        setMenu(null);
        triggerRef.current?.focus();
        if (result.people[index].salutation === salutation) return;
        setBusy(true);
        try {
            const person = { ...result.people[index], salutation };
            const image = await renderBadge(result.settings, person);
            await api.put(`/name-badges/users/${person.id}`, { salutation, position: person.position });
            setResult(previous => ({ ...previous,
                people: previous.people.map((p, i) => i === index ? person : p),
                images: previous.images.map((img, i) => i === index ? image : img)
            }));
        } catch (e) { toast.error(e.response?.data?.error || e.message); }
        finally { setBusy(false); }
    };
    return <div className="space-y-4 min-w-0">
        <p className="text-sm text-muted-foreground">{users.length} Namensschilder · Gespeicherte Anrede und Zusätze werden übernommen. Startposition und Abstände gelten auf jeder Seite.</p>
        <p className="text-sm">Klicke auf ein Namensschild, um die Anrede zu ändern. Die Auswahl wird sofort gespeichert und für künftige Ausdrucke übernommen.</p>
        {busy && <p role="status" className="text-sm">Wird verarbeitet …</p>}
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
                    {page.map(cell => <button type="button" key={cell.index} disabled={busy} aria-label={`Anrede für ${users[cell.index].displayName} ändern: ${result.people[cell.index].salutation || 'Keine Anrede'}`} aria-haspopup="dialog" aria-expanded={menu?.index === cell.index} onClick={event => { triggerRef.current = event.currentTarget; setMenu({ index: cell.index, page: i, x: cell.x / layout.pageWidth * 100, y: cell.y / layout.pageHeight * 100 }); }} className="absolute block p-0 border-0 bg-transparent cursor-pointer hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait" style={{ left: `${cell.x / layout.pageWidth * 100}%`, top: `${cell.y / layout.pageHeight * 100}%`, width: `${layout.width / layout.pageWidth * 100}%`, height: `${layout.height / layout.pageHeight * 100}%` }}><img src={result.images[cell.index]} alt={`Namensschild ${users[cell.index].displayName}`} className="w-full h-full" /></button>)}
                    {menu?.page === i && <div ref={menuRef} role="dialog" aria-label="Anrede auswählen" className="absolute z-10 w-[280px] max-w-full rounded-lg border bg-background shadow-xl p-3" style={{ left: `clamp(0px, ${menu.x}%, max(0px, 100% - 280px))`, top: `clamp(0px, ${menu.y}%, max(0px, 100% - 120px))` }}>
                        <p className="text-sm font-medium truncate mb-2">{users[menu.index].displayName}</p>
                        <div className="flex flex-wrap gap-1">{[['', 'Keine Anrede'], ['Frau', 'Frau'], ['Herr', 'Herr']].map(([value, label]) => <Button key={value} type="button" size="sm" variant={result.people[menu.index].salutation === value ? 'default' : 'outline'} aria-pressed={result.people[menu.index].salutation === value} onClick={() => chooseSalutation(value)}>{label}</Button>)}</div>
                    </div>}
                </div></figure>)}
            </div>
        </>}
    </div>;
}
