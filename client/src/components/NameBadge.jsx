import { useEffect, useState } from 'react';
import api from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { toast } from 'sonner';
import { badgeSurname, bookingUrl, renderBadge, printBadge, downloadBadge } from '../lib/nameBadge';

export default function NameBadge({ userId }) {
    const [settings, setSettings] = useState(null);
    const [person, setPerson] = useState(null);
    const [image, setImage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [custom, setCustom] = useState(false);
    useEffect(() => {
        let active = true;
        Promise.all([api.get('/name-badges/settings'), api.get(`/name-badges/users/${userId}`)])
            .then(([s, p]) => { if (active) { setSettings(s.data); setPerson(p.data); setCustom(!['Lehrer', 'Lehrerin', 'Schulleitung'].includes(p.data.position)); } })
            .catch(() => { if (active) setError('Namensschild konnte nicht geladen werden.'); });
        return () => { active = false; };
    }, [userId]);
    useEffect(() => {
        if (!settings || !person) return;
        let active = true;
        setImage(''); setError('');
        renderBadge(settings, person).then(img => { if (active) setImage(img); }).catch(e => { if (active) setError(e.message); });
        return () => { active = false; };
    }, [settings, person]);
    const run = async fn => { setBusy(true); try { await fn(); } catch (e) { toast.error(e.response?.data?.error || e.message); } finally { setBusy(false); } };
    return <Card>
        <CardHeader><CardTitle>Namensschild</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            {error && <p role="alert" className="text-red-700">{error}</p>}
            {!person && !error && <p>Namensschild wird geladen …</p>}
            {person && <>
                <div className="grid sm:grid-cols-2 gap-4">
                    <label className="space-y-2">Anrede<select aria-label="Anrede" className="w-full rounded border p-2 bg-background" value={person.salutation} onChange={e => setPerson({ ...person, salutation: e.target.value })}><option>Herr</option><option>Frau</option></select></label>
                    <label className="space-y-2">Nachname<Input value={badgeSurname(person.displayName)} readOnly /></label>
                </div>
                <p className="text-xs text-muted-foreground">Der Nachname wird aus dem Anzeigenamen bis zum ersten Komma übernommen.</p>
                <label className="block space-y-2">Zusatz<select aria-label="Zusatz" className="w-full rounded border p-2 bg-background" value={custom ? 'custom' : person.position} onChange={e => { setCustom(e.target.value === 'custom'); setPerson({ ...person, position: e.target.value === 'custom' ? '' : e.target.value }); }}><option>Lehrer</option><option>Lehrerin</option><option>Schulleitung</option><option value="custom">Eigener Zusatz</option></select></label>
                {custom && <Input aria-label="Eigener Zusatz" placeholder="z. B. Schulsozialarbeit" maxLength={100} value={person.position} onChange={e => setPerson({ ...person, position: e.target.value })} />}
                {!person.bookingPageActive && <p className="text-amber-800 bg-amber-50 p-3 rounded">Die Buchungsseite dieser Person ist deaktiviert. Bitte vor der Verwendung des QR-Codes im Profil aktivieren.</p>}
                {image && <div className="border rounded bg-slate-100 p-4"><img src={image} alt="Vorschau des Namensschilds" className="max-w-full mx-auto shadow" style={{ width: `${settings.width}mm` }} /></div>}
                {image && <p className="text-sm text-muted-foreground">{settings.width} × {settings.height} mm · <a className="underline" href={bookingUrl(settings.appUrl, person.id)} target="_blank" rel="noreferrer">Buchungsseite prüfen</a></p>}
                {!settings?.logo && settings && <p className="text-sm text-muted-foreground">Noch kein Logo hinterlegt. Der Administrator kann das vollständige Schullogo unter Einstellungen hochladen.</p>}
                <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={busy || !person.position.trim()} variant="outline" onClick={() => run(async () => { await api.put(`/name-badges/users/${userId}`, { salutation: person.salutation, position: person.position }); toast.success('Schild-Angaben gespeichert.'); })}>Angaben speichern</Button>
                    <Button type="button" disabled={busy || !image || !person.position.trim()} onClick={() => run(() => printBadge(image, settings))}>Drucken</Button>
                    <Button type="button" disabled={busy || !image || !person.position.trim()} onClick={() => run(() => downloadBadge(image, settings))}>PDF herunterladen</Button>
                </div>
                <p className="text-xs text-muted-foreground">Beim Drucken „Tatsächliche Größe“ bzw. 100 % wählen und Kopf-/Fußzeilen ausschalten. Das PDF hat exakt das eingestellte Schildformat.</p>
            </>}
        </CardContent>
    </Card>;
}
