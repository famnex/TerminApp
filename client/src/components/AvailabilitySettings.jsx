import { useEffect, useState } from 'react';
import api from '../api';
import { Button } from './ui/button';
import { CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { toast } from 'sonner';

const options = [
    { value: 'slot_start', title: 'Bis zum Beginn des Slots', description: 'Buchungen sind möglich, solange der Termin noch nicht begonnen hat.' },
    { value: 'hours_24', title: '24 Stunden vorher', description: 'Buchungen sind bis 24 Stunden vor Terminbeginn möglich. Beispiel: Mittwoch, 15 Uhr → Buchung bis Dienstag, 15 Uhr.' },
    { value: 'hours_48', title: '48 Stunden vorher', description: 'Buchungen sind bis 48 Stunden vor Terminbeginn möglich. Beispiel: Mittwoch, 15 Uhr → Buchung bis Montag, 15 Uhr.' }
];
export default function AvailabilitySettings() {
    const [value, setValue] = useState(null);
    const [saved, setSaved] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        let active = true;
        api.get('/availability/settings').then(({ data }) => {
            if (active) { setValue(data.bookingDeadline); setSaved(data.bookingDeadline); }
        }).catch(() => { if (active) setError('Die Buchungsfrist konnte nicht geladen werden. Bitte lade die Seite erneut.'); });
        return () => { active = false; };
    }, []);
    const save = async e => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            const { data } = await api.put('/availability/settings', { bookingDeadline: value });
            setSaved(data.bookingDeadline); toast.success('Deine Buchungsfrist wurde gespeichert.');
        } catch (e) { setError(e.response?.data?.error || 'Die Buchungsfrist konnte nicht gespeichert werden.'); }
        finally { setSaving(false); }
    };
    return <>
        <CardHeader><CardTitle>Persönliche Buchungsfrist</CardTitle><CardDescription>Lege fest, bis wann andere Personen einen Termin bei dir buchen können. Diese Einstellung gilt nur für deine eigenen Termine.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {value === null && !error && <p role="status">Einstellungen werden geladen …</p>}
            {value !== null && <form onSubmit={save} className="space-y-5 max-w-2xl">
                <fieldset disabled={saving} className="space-y-3">
                    <legend className="font-medium mb-3">Bis wann sind Buchungen möglich?</legend>
                    {options.map(option => <label key={option.value} className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${value === option.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <input type="radio" name="bookingDeadline" value={option.value} checked={value === option.value} onChange={() => setValue(option.value)} className="mt-1" />
                        <span><span className="block font-medium">{option.title}{option.value === 'hours_48' && <span className="ml-2 text-xs text-muted-foreground">Standard</span>}</span><span className="block text-sm text-muted-foreground mt-1">{option.description}</span></span>
                    </label>)}
                </fieldset>
                <p className="text-sm text-muted-foreground">Es zählen tatsächlich verstrichene Stunden, auch bei der Umstellung zwischen Sommer- und Winterzeit. Bereits gebuchte Termine bleiben bestehen. Änderungen gelten nach dem Speichern für neue Buchungen.</p>
                <Button type="submit" disabled={saving || value === saved}>{saving ? 'Wird gespeichert …' : 'Buchungsfrist speichern'}</Button>
            </form>}
        </CardContent>
    </>;
}
