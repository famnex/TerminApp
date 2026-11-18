import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

const weekdays = [[1, 'Montag'], [2, 'Dienstag'], [3, 'Mittwoch'], [4, 'Donnerstag'], [5, 'Freitag'], [6, 'Samstag'], [0, 'Sonntag']];
const deadlineLabels = { slot_start: 'Bis zum Beginn des Slots', hours_24: '24 Stunden vorher', hours_48: '48 Stunden vorher' };
const dateLabel = value => value ? value.slice(0, 10).split('-').reverse().join('.') : '—';
const tabStyle = 'flex flex-wrap justify-start h-auto gap-1';
const Empty = ({ children }) => <p className="text-sm text-muted-foreground p-4">{children}</p>;
function Rule({ rule }) {
    return <div className="rounded-lg border bg-background p-3 space-y-2 min-w-0">
        <p className="font-semibold">{rule.startTime}–{rule.endTime} Uhr</p>
        {['odd_week', 'even_week'].includes(rule.type) && <p className="text-sm">{rule.type === 'odd_week' ? 'Ungerade Kalenderwochen' : 'Gerade Kalenderwochen'}</p>}
        <p className="text-sm break-words">Themen: {rule.Topics?.length ? rule.Topics.map(t => t.title).join(', ') : 'Alle Themen'}</p>
        <p className="text-xs text-muted-foreground">{rule.validUntil ? `Gültig bis ${dateLabel(rule.validUntil)}` : 'Ohne Ablaufdatum'}{rule.batchConfigId ? ' · Zentral zugewiesen' : ''}</p>
    </div>;
}
function UserAvailability({ data }) {
    const [showPastDates, setShowPastDates] = useState(false);
    const [showPastAbsences, setShowPastAbsences] = useState(false);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const specific = data.availabilities.filter(a => a.type === 'specific_date').sort((a, b) => a.specificDate.localeCompare(b.specificDate) || a.startTime.localeCompare(b.startTime));
    const dates = specific.filter(a => showPastDates || a.specificDate >= today);
    const absences = data.timeOffs.filter(a => showPastAbsences || a.endDate >= today);
    return <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList className={tabStyle}>
            <TabsTrigger value="weekly">Wöchentlich</TabsTrigger><TabsTrigger value="rotating">Rotierend</TabsTrigger><TabsTrigger value="specific">Einzelne Tage</TabsTrigger><TabsTrigger value="absences">Abwesenheiten</TabsTrigger><TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>
        {['weekly', 'rotating'].map(type => <TabsContent key={type} value={type}><Card><CardContent className="pt-4 space-y-4">
            {weekdays.map(([id, label]) => {
                const rules = data.availabilities.filter(a => a.dayOfWeek === id && (type === 'weekly' ? a.type === 'weekly' : ['odd_week', 'even_week'].includes(a.type)));
                return <section key={id} className="grid sm:grid-cols-[120px_1fr] gap-3 border-b last:border-0 pb-4"><h3 className="font-medium py-2">{label}</h3><div className="grid md:grid-cols-2 gap-3">{rules.length ? rules.map(rule => <Rule key={rule.id} rule={rule} />) : <Empty>Keine Zeiten eingetragen.</Empty>}</div></section>;
            })}
        </CardContent></Card></TabsContent>)}
        <TabsContent value="specific" className="space-y-4">
            <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={showPastDates} onChange={e => setShowPastDates(e.target.checked)} />Vergangene Tage anzeigen ({specific.filter(a => a.specificDate < today).length})</label>
            <div className="grid md:grid-cols-2 gap-4">{dates.map(rule => <Card key={rule.id}><CardHeader><CardTitle className="text-base">{dateLabel(rule.specificDate)}{rule.specificDate < today && ' · vergangen'}</CardTitle></CardHeader><CardContent><Rule rule={rule} /></CardContent></Card>)}</div>
            {!dates.length && <Empty>Keine einzelnen Tage in dieser Ansicht.</Empty>}
        </TabsContent>
        <TabsContent value="absences" className="space-y-4">
            <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={showPastAbsences} onChange={e => setShowPastAbsences(e.target.checked)} />Vergangene Abwesenheiten anzeigen ({data.timeOffs.filter(a => a.endDate < today).length})</label>
            <div className="grid md:grid-cols-2 gap-4">{absences.map(a => <Card key={a.id}><CardHeader><CardTitle className="text-base">{dateLabel(a.startDate)}–{dateLabel(a.endDate)}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm font-medium">{a.userId === null ? 'Zentrale Abwesenheit · gilt für alle' : 'Persönliche Abwesenheit'}</p><p className="text-sm whitespace-pre-wrap break-words">{a.reason || 'Kein Grund angegeben'}</p></CardContent></Card>)}</div>
            {!absences.length && <Empty>Keine Abwesenheiten in dieser Ansicht.</Empty>}
        </TabsContent>
        <TabsContent value="settings"><Card><CardHeader><CardTitle>Persönliche Buchungsfrist</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-lg font-semibold">{deadlineLabels[data.user.bookingDeadline] || 'Nicht festgelegt'}</p><p className="text-sm text-muted-foreground">Diese Einstellung gilt für die Termine von {data.user.displayName}. Bei 24 bzw. 48 Stunden zählen tatsächlich verstrichene Stunden.</p></CardContent></Card></TabsContent>
    </Tabs>;
}
export default function AdminUserSettings() {
    const { user: viewer } = useAuth();
    const { userId } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState(null);
    const data = result?.id === userId ? result.data : null;
    const error = result?.id === userId ? result.error : '';
    useEffect(() => {
        if (!viewer?.isAdmin) return;
        let active = true;
        api.get(`/admin/users/${encodeURIComponent(userId)}/settings`).then(r => { if (active) setResult({ id: userId, data: r.data, error: '' }); }).catch(e => { if (active) setResult({ id: userId, data: null, error: e.response?.data?.error || 'Die Benutzereinstellungen konnten nicht geladen werden.' }); });
        return () => { active = false; };
    }, [userId, viewer?.isAdmin]);
    if (!viewer?.isAdmin) return <Navigate to="/dashboard" replace />;
    const person = data?.user;
    const fields = person ? [
        ['Anzeigename', person.displayName], ['Benutzername', person.username], ['E-Mail-Adresse', person.email],
        ['Position / Funktion', person.position], ['Ort', person.location],
        ['Ortsangabe', ({ none: 'Keine Angabe', room: 'Raum', custom: 'Eigene Angabe', secretariat: 'Treffpunkt Sekretariat' })[person.locationType] || person.locationType],
        ['Abteilungen', person.Departments?.map(d => d.name).join(', ')], ['Rolle', person.isAdmin ? 'Administrator' : 'Benutzer'],
        ['Anmeldung', person.authMethod?.toUpperCase()], ['E-Mail öffentlich', person.showEmail ? 'Ja' : 'Nein'],
        ['Buchungsseite', person.bookingPageActive ? 'Aktiv' : 'Inaktiv'], ['Name durch Admin festgelegt', person.displayNameOverridden ? 'Ja' : 'Nein']
    ] : [];
    return <div className="max-w-5xl mx-auto space-y-6 pb-20 min-w-0">
        <Button variant="ghost" onClick={() => navigate('/dashboard/users')} className="pl-0"><ChevronLeft className="mr-2 h-4 w-4" />Zurück zur Benutzerverwaltung</Button>
        <div><h1 className="text-2xl sm:text-3xl font-bold break-words">{person ? `Einstellungen von ${person.displayName}` : 'Benutzereinstellungen'}</h1><p className="text-muted-foreground mt-2">Admin-Ansicht · Nur Lesen. Die bestehende Profilbearbeitung ist über das Stift-Symbol in der Benutzerverwaltung erreichbar.</p></div>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {!data && !error && <div role="status" className="flex gap-2 items-center"><Loader2 className="animate-spin h-5 w-5" />Einstellungen werden geladen …</div>}
        {person && <Tabs key={person.id} defaultValue="profile" className="space-y-5">
            <TabsList><TabsTrigger value="profile">Profil</TabsTrigger><TabsTrigger value="availability">Verfügbarkeiten</TabsTrigger></TabsList>
            <TabsContent value="profile"><Card><CardHeader><CardTitle>Profil</CardTitle></CardHeader><CardContent className="space-y-6">
                {person.profileImage && <img src={person.profileImage} alt={`Profilbild von ${person.displayName}`} className="w-24 h-24 object-cover rounded-full border" />}
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-medium whitespace-pre-wrap break-words">{value || '—'}</dd></div>)}</dl>
                <div><h3 className="text-sm text-muted-foreground">Nachricht statt Buchungsmöglichkeit</h3><p className="whitespace-pre-wrap break-words">{person.bookingNotice || 'Keine Nachricht hinterlegt'}</p></div>
            </CardContent></Card></TabsContent>
            <TabsContent value="availability"><UserAvailability data={data} /></TabsContent>
        </Tabs>}
    </div>;
}
