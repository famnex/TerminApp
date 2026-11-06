import { useEffect, useState } from 'react';
import api from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { toast } from 'sonner';
export default function NameBadgeSettings() {
    const [settings, setSettings] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { api.get('/name-badges/settings').then(r => setSettings(r.data)).catch(() => setError('Schild-Einstellungen konnten nicht geladen werden.')); }, []);
    const upload = async e => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Das Logo darf maximal 2 MB groß sein.'); return; }
        setBusy(true);
        try {
            const data = new FormData(); data.append('logo', file);
            const result = await api.post('/name-badges/logo', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSettings(s => ({ ...s, logo: result.data.path }));
            toast.success('Logo hochgeladen. Bitte Schild-Einstellungen speichern.');
        } catch (e) { toast.error(e.response?.data?.error || 'Logo-Upload fehlgeschlagen.'); }
        finally { setBusy(false); }
    };
    const save = async e => {
        e.preventDefault(); setBusy(true);
        try {
            await api.put('/name-badges/settings', { width: Number(settings.width), height: Number(settings.height), logo: settings.logo });
            toast.success('Schild-Einstellungen gespeichert.');
        } catch (e) { toast.error(e.response?.data?.error || 'Speichern fehlgeschlagen.'); }
        finally { setBusy(false); }
    };
    return <Card><CardHeader><CardTitle>Namensschilder</CardTitle></CardHeader><CardContent>
        {error && <p role="alert">{error}</p>}
        {!settings && !error && <p>Einstellungen werden geladen …</p>}
        {settings && <form onSubmit={save} className="space-y-4">
            <p className="text-sm text-muted-foreground">Maße und Logo gelten für alle Namensschilder. Oben steht das Logo zentriert, darunter links der QR-Code und rechts Name und Zusatz.</p>
            <div className="grid grid-cols-2 gap-4">
                <label>Breite (mm)<Input type="number" min="40" max="200" step="0.1" required value={settings.width} onChange={e => setSettings({ ...settings, width: e.target.value })} /></label>
                <label>Höhe (mm)<Input type="number" min="40" max="200" step="0.1" required value={settings.height} onChange={e => setSettings({ ...settings, height: e.target.value })} /></label>
            </div>
            <label className="block space-y-2">Vollständiges Logo inklusive Schriftzug<Input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={upload} /></label>
            <p className="text-xs text-muted-foreground">PNG oder JPEG, maximal 2 MB. Bitte das MSO-Logo inklusive „Modellschule Obersberg“ als Bild verwenden. Das Seitenverhältnis bleibt erhalten.</p>
            {settings.logo && <><img src={settings.logo} alt="Namensschild-Logo" className="max-h-28 max-w-full bg-white p-2 border" /><Button type="button" variant="outline" onClick={() => setSettings({ ...settings, logo: '' })}>Logo entfernen</Button></>}
            <p className="text-xs text-muted-foreground">Der QR-Code verwendet die Anwendungs-URL aus „Schule / Allgemein“, andernfalls die aktuell aufgerufene App-Adresse.</p>
            <Button type="submit" disabled={busy}>Schild-Einstellungen speichern</Button>
        </form>}
    </CardContent></Card>;
}
