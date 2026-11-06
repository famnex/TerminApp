import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { renderBadge, printBadge, downloadBadge } from '../lib/nameBadge';
import { badgeNumberErrors, badgeNumberRules } from '../lib/nameBadgeValidation';
import { toast } from 'sonner';

export default function NameBadgeSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState(null);
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [previewError, setPreviewError] = useState('');
    const [image, setImage] = useState('');
    const [logoRatio, setLogoRatio] = useState(null);
    const [exampleName, setExampleName] = useState(user?.displayName || 'Mustermann, Max');
    const [examplePosition, setExamplePosition] = useState('Lehrer');
    useEffect(() => {
        let active = true;
        api.get('/name-badges/settings').then(r => { if (active) setSettings(r.data); }).catch(() => { if (active) setLoadError('Schild-Einstellungen konnten nicht geladen werden.'); });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (!settings) return;
        let active = true;
        setImage(''); setPreviewError('');
        const timer = setTimeout(() => {
            renderBadge(settings, { id: user.id, salutation: 'Herr', displayName: exampleName, position: examplePosition })
                .then(result => { if (active) setImage(result); })
                .catch(e => { if (active) setPreviewError(e.message); });
        }, 120);
        return () => { active = false; clearTimeout(timer); };
    }, [settings, exampleName, examplePosition, user.id]);
    const change = (key, value) => setSettings(s => ({ ...s, [key]: value }));
    const fieldErrors = settings ? badgeNumberErrors(settings) : {};
    const number = (key, label, min, max, step = 0.1) => <label className="block text-sm space-y-1" key={key}>
        <span>{label}</span><Input id={`badge-${key}`} type="number" required min={min} max={max} step={step} value={settings[key]}
            aria-invalid={!!fieldErrors[key]} aria-describedby={`badge-${key}-help`}
            className={fieldErrors[key] ? 'border-red-600 focus-visible:ring-red-600' : ''}
            onChange={e => change(key, e.target.value === '' ? '' : Number(e.target.value))} />
        <span id={`badge-${key}-help`} className={`block text-xs ${fieldErrors[key] ? 'text-red-700' : 'text-muted-foreground'}`}>
            {fieldErrors[key] || `Erlaubt: ${String(min).replace('.', ',')}–${String(max).replace('.', ',')} ${badgeNumberRules[key][3]}`}
        </span>
    </label>;
    const color = (key, label) => <label className="block text-sm space-y-1" key={key}><span>{label}</span><Input type="color" value={settings[key]} onChange={e => change(key, e.target.value)} className="p-1 h-10" /></label>;
    const upload = async e => {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Das Logo darf maximal 2 MB groß sein.'); return; }
        setBusy(true);
        try {
            const data = new FormData(); data.append('logo', file);
            const result = await api.post('/name-badges/logo', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            setLogoRatio(null); change('logo', result.data.path);
            toast.success('Logo hochgeladen. Bitte anschließend die Einstellungen speichern.');
        } catch (e) { toast.error(e.response?.data?.error || 'Logo-Upload fehlgeschlagen.'); }
        finally { setBusy(false); }
    };
    const save = async e => {
        e.preventDefault(); setBusy(true);
        try { await api.put('/name-badges/settings', settings); toast.success('Schild-Einstellungen gespeichert.'); }
        catch (e) { toast.error(e.response?.data?.error || 'Speichern fehlgeschlagen.'); }
        finally { setBusy(false); }
    };
    const output = async pdf => {
        try { if (pdf) await downloadBadge(image, settings); else printBadge(image, settings, true); }
        catch (e) { toast.error(e.message); }
    };
    return <Card><CardHeader><CardTitle>Namensschilder</CardTitle></CardHeader><CardContent>
        {loadError && <p role="alert">{loadError}</p>}
        {!settings && !loadError && <p>Einstellungen werden geladen …</p>}
        {settings && <form onSubmit={save} className="space-y-6">
            <p className="text-sm text-muted-foreground">Die Vorlage gilt für alle Benutzer. Abstände und Größen in Millimetern, Schriftgrößen in Punkt (pt). Die Vorschau zeigt Änderungen sofort; dauerhaft gelten sie nach dem Speichern.</p>
            <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                    <fieldset className="space-y-3"><legend className="font-semibold">Schild und Rahmen</legend><div className="grid grid-cols-2 gap-3">
                        {number('width', 'Schildbreite (mm)', 40, 200)}{number('height', 'Schildhöhe (mm)', 40, 200)}
                        {number('margin', 'Seiten-/Unterrand (mm)', 1, 20)}{number('borderWidth', 'Rahmenstärke (mm)', 0.1, 2)}
                        {color('borderColor', 'Rahmenfarbe')}
                    </div></fieldset>
                    <fieldset className="space-y-3"><legend className="font-semibold">Logo · Höhe automatisch</legend>
                        <label className="block text-sm space-y-1">Vollständiges Logo inklusive Schriftzug<Input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={upload} /></label>
                        <p className="text-xs text-muted-foreground">PNG/JPEG, maximal 2 MB. Die Höhe folgt dem Seitenverhältnis der Bilddatei.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {number('logoOffsetX', 'Horizontal verschieben (mm)', -190, 190)}{number('logoWidth', 'Logo-Breite (mm)', 5, 190)}{number('logoTop', 'Abstand oben (mm)', 0, 190)}
                            <label className="text-sm space-y-1">Ausrichtung<select className="w-full rounded border p-2 bg-background" value={settings.logoAlign} onChange={e => change('logoAlign', e.target.value)}><option value="left">Links</option><option value="center">Zentriert</option><option value="right">Rechts</option></select></label>
                            <p className="text-sm self-end pb-2">Höhe: {settings.logo && logoRatio ? `${(Number(settings.logoWidth) * logoRatio).toFixed(1)} mm` : 'automatisch'}</p>
                        </div>
                        {settings.logo && <><img src={settings.logo} alt="Original-Logo" className="max-h-16 max-w-full bg-white p-1 border" onLoad={e => setLogoRatio(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth)} /><Button type="button" variant="outline" onClick={() => { change('logo', ''); setLogoRatio(null); }}>Logo entfernen</Button></>}
                    </fieldset>
                    <fieldset className="space-y-3"><legend className="font-semibold">QR-Code und Abstände</legend><div className="grid grid-cols-2 gap-3">
                        {number('contentTop', 'QR-/Textbereich oben (mm)', 0, 190)}{number('qrSize', 'QR-Code-Größe (mm)', 15, 80)}
                        {number('textGap', 'Abstand QR → Text (mm)', 1, 30)}{color('qrColor', 'QR-Code-Farbe')}
                    </div><p className="text-xs text-muted-foreground">Die QR-Größe umfasst den weißen Sicherheitsrand. Für zuverlässiges Scannen möglichst mindestens 20 mm verwenden. Die Farbe muss auf Weiß dunkel genug sein.</p></fieldset>
                    <fieldset className="space-y-3"><legend className="font-semibold">Schrift</legend><div className="grid grid-cols-2 gap-3">
                        {number('nameFontSize', 'Name: Größe (pt)', 6, 60, 0.5)}{color('nameColor', 'Name: Farbe')}
                        {number('positionFontSize', 'Zusatz: Größe (pt)', 6, 48, 0.5)}{color('positionColor', 'Zusatz: Farbe')}
                        {number('lineGap', 'Abstand Name → Zusatz (mm)', 0, 20)}
                    </div><p className="text-xs text-muted-foreground">Text wird umgebrochen, aber nicht unbemerkt verkleinert. Bei zu wenig Platz erscheint ein Hinweis.</p></fieldset>
                    <fieldset className="space-y-3"><legend className="font-semibold">Druckmaß</legend>
                        {number('printScale', 'Druckkorrektur (%)', 50, 150)}
                        <p className="text-xs text-muted-foreground">Standard: 100 %. Zuerst A4 und „Tatsächliche Größe / 100 %“ im Druckdialog wählen. Bei verbleibender Abweichung: neue Korrektur = bisherige Korrektur × Sollmaß ÷ gemessenes Maß.</p>
                    </fieldset>
                </div>
                <div className="md:sticky md:top-4 space-y-4">
                    <h3 className="font-semibold">Live-Vorschau</h3>
                    <label className="block text-sm space-y-1">Beispielname<Input value={exampleName} maxLength={255} onChange={e => setExampleName(e.target.value)} /></label>
                    <label className="block text-sm space-y-1">Beispiel-Zusatz<Input value={examplePosition} maxLength={100} onChange={e => setExamplePosition(e.target.value)} /></label>
                    <p className="text-xs text-muted-foreground">Beispieldaten ändern keine Benutzerprofile. Der Test-QR-Code führt zu deiner Buchungsseite.</p>
                    <div className="bg-slate-100 rounded-lg p-4 min-h-40 flex items-center justify-center" aria-live="polite">
                        {image ? <img src={image} alt="Live-Vorschau des Namensschilds" className="w-full shadow" /> : <p className="text-sm text-slate-700 whitespace-pre-line">{previewError || 'Vorschau wird erstellt …'}</p>}
                    </div>
                    {previewError && <p role="alert" className="text-sm text-red-700 whitespace-pre-line">{previewError}</p>}
                    <p className="text-sm">Schild: {settings.width} × {settings.height} mm<br />Druck: {(Number(settings.width) * Number(settings.printScale) / 100).toFixed(1)} × {(Number(settings.height) * Number(settings.printScale) / 100).toFixed(1)} mm</p>
                    <p className="text-xs text-muted-foreground">Die Vorschau ist an den Bildschirm angepasst, nicht in physischer Originalgröße. Druck und PDF enthalten den Rahmen innerhalb der angegebenen Maße.</p>
                    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!image || busy} onClick={() => output(false)}>Testdruck mit Kontrollmaß</Button><Button type="button" variant="outline" disabled={!image || busy} onClick={() => output(true)}>Test-PDF (A4)</Button></div>
                    <p className="text-xs text-muted-foreground">Der Testdruck enthält eine 50-mm-Kontrolllinie. Diese muss auf Papier genau 50 mm lang sein. PDF und Druck verwenden ein A4-Blatt, damit das Schild nicht automatisch auf Blattgröße vergrößert wird.</p>
                    <Button type="submit" disabled={busy || !image || !!previewError}>Schild-Einstellungen speichern</Button>
                </div>
            </div>
        </form>}
    </CardContent></Card>;
}
