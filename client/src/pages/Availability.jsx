import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, ChevronLeft, Repeat, CalendarDays, AlertCircle, CalendarOff, Palmtree } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { cn } from "../lib/utils"
import { toast } from "sonner"

const Availability = () => {
    const navigate = useNavigate();
    const [availabilities, setAvailabilities] = useState([]);
    const [timeOffs, setTimeOffs] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState('weekly'); // weekly, rotating, specific, absences
    const [showModal, setShowModal] = useState(false);

    // Form State (Availability)
    const [newItem, setNewItem] = useState({
        type: 'weekly', // weekly, odd_week, even_week, specific_date
        dayOfWeek: 1,
        specificDate: '',
        startTime: '09:00',
        endTime: '17:00',
        validUntil: ''
    });

    // Form State (Time Off)
    const [newTimeOff, setNewTimeOff] = useState({
        startDate: '',
        endDate: '',
        reason: ''
    });

    const days = [
        { id: 1, label: 'Montag' },
        { id: 2, label: 'Dienstag' },
        { id: 3, label: 'Mittwoch' },
        { id: 4, label: 'Donnerstag' },
        { id: 5, label: 'Freitag' },
        { id: 6, label: 'Samstag' },
        { id: 0, label: 'Sonntag' },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [availRes, timeOffRes] = await Promise.all([
                api.get('/availability/mine'),
                api.get('/timeoff/mine')
            ]);
            setAvailabilities(availRes.data);
            setTimeOffs(timeOffRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Laden der Daten.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAvailability = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newItem,
                validUntil: newItem.validUntil === '' ? null : newItem.validUntil
            };
            await api.post('/availability', payload);
            setShowModal(false);
            fetchData();
            toast.success("Verfügbarkeit erfolgreich gespeichert.");
        } catch (err) {
            toast.error('Fehler beim Speichern: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleSaveTimeOff = async (e) => {
        e.preventDefault();
        try {
            await api.post('/timeoff', newTimeOff);
            setShowModal(false);
            fetchData();
            toast.success("Abwesenheit erfolgreich gespeichert.");
        } catch (err) {
            toast.error('Fehler beim Speichern: ' + (err.response?.data?.error || err.message));
        }
    };

    const deleteAvailability = async (id) => {
        try {
            await api.delete(`/availability/${id}`);
            fetchData();
            toast.success("Eintrag gelöscht.");
        } catch (err) {
            toast.error('Fehler beim Löschen');
        }
    };

    const deleteTimeOff = async (id) => {
        try {
            await api.delete(`/timeoff/${id}`);
            fetchData();
            toast.success("Abwesenheit gelöscht.");
        } catch (err) {
            toast.error('Fehler beim Löschen');
        }
    };

    // Helper to group slots
    const getSlots = (typeFilter, dayId) => {
        return availabilities.filter(a => {
            if (typeFilter === 'specific_date') return a.type === 'specific_date';
            // For weekly/rotating tab, filter per day and type
            if (a.dayOfWeek !== dayId) return false;

            if (typeFilter === 'weekly') return a.type === 'weekly';
            if (typeFilter === 'rotating') return a.type === 'odd_week' || a.type === 'even_week';
            return false;
        });
    };

    const openModal = (prefillType = 'weekly', dayId = 1) => {
        if (activeTab === 'absences') {
            setNewTimeOff({
                startDate: format(new Date(), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
                reason: ''
            });
        } else {
            setNewItem({
                type: prefillType === 'time_off' ? 'weekly' : prefillType, // fallback
                dayOfWeek: dayId,
                specificDate: format(new Date(), 'yyyy-MM-dd'),
                startTime: '09:00',
                endTime: '17:00',
                validUntil: ''
            });
        }
        setShowModal(true);
    };

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up pb-20">
            {/* Header */}
            <div>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 text-muted-foreground hover:text-primary mb-4">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Zurück zum Dashboard
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Verfügbarkeit & Abwesenheit</h1>
                    <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Arbeitszeiten und blockierte Tage.</p>
                </div>
            </div>

            {/* TABS (Segmented Control Style) */}
            <div className="flex space-x-1 rounded-xl bg-muted p-1 w-full md:w-auto md:inline-flex overflow-x-auto">
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={cn(
                        "flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                        activeTab === 'weekly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                    )}
                >
                    <Repeat size={16} /> Wöchentlich
                </button>
                <div className="w-px bg-border my-2 mx-1 hidden md:block opacity-20" />
                <button
                    onClick={() => setActiveTab('rotating')}
                    className={cn(
                        "flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                        activeTab === 'rotating' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                    )}
                >
                    <CalendarDays size={16} /> Rotierend
                </button>
                <div className="w-px bg-border my-2 mx-1 hidden md:block opacity-20" />
                <button
                    onClick={() => setActiveTab('specific')}
                    className={cn(
                        "flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                        activeTab === 'specific' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                    )}
                >
                    <CalendarIcon size={16} /> Einzelne Tage
                </button>
                <div className="w-px bg-border my-2 mx-1 hidden md:block opacity-20" />
                <button
                    onClick={() => setActiveTab('absences')}
                    className={cn(
                        "flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                        activeTab === 'absences' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'
                    )}
                >
                    <Palmtree size={16} /> Abwesenheiten
                </button>
            </div>

            <Card className="min-h-[500px]">
                {/* WEEKLY & ROTATING VIEW */}
                {(activeTab === 'weekly' || activeTab === 'rotating') && (
                    <div className="divide-y divide-border/50">
                        {days.map(day => {
                            const slots = getSlots(activeTab, day.id);

                            return (
                                <div key={day.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-start gap-4">
                                    <div className="w-32 pt-2">
                                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            {day.label}
                                        </h4>
                                        {day.id === 0 || day.id === 6 ? <span className="text-[10px] text-muted-foreground/70 font-medium">Wochenende</span> : null}
                                    </div>

                                    <div className="flex-1 flex flex-wrap gap-3">
                                        {slots.length === 0 ? (
                                            <div className="py-2 text-sm text-muted-foreground italic flex items-center gap-2"><AlertCircle size={14} className="opacity-50" /> Keine Zeiten eingetragen</div>
                                        ) : (
                                            slots.map(slot => (
                                                <div key={slot.id} className="group relative bg-background border border-border rounded-lg pl-3 pr-8 py-2 shadow-sm text-sm flex items-center gap-3 transition-all hover:bg-accent/10 hover:border-primary/30">
                                                    {activeTab === 'rotating' && (
                                                        <span className={cn(
                                                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                                            slot.type === 'even_week' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                        )}>
                                                            {slot.type === 'even_week' ? 'Gerade' : 'Ungerade'}
                                                        </span>
                                                    )}
                                                    <span className="font-mono font-medium">{slot.startTime} - {slot.endTime}</span>

                                                    {slot.validUntil && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                                                            <CalendarOff size={10} /> bis {format(parseISO(slot.validUntil), 'dd.MM.yyyy')}
                                                        </span>
                                                    )}

                                                    {slot.batchConfigId ? (
                                                        <div title="Vom Admin verwaltet" className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/50 cursor-not-allowed opacity-0 group-hover:opacity-100">
                                                            <Trash2 size={14} />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => deleteAvailability(slot.id)}
                                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openModal(activeTab === 'rotating' ? 'odd_week' : 'weekly', day.id)}
                                            className="h-9 ml-2 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 rounded-full"
                                        >
                                            <Plus size={14} className="mr-1" /> Zeit hinzufügen
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* SPECIFIC DATES VIEW */}
                {activeTab === 'specific' && (
                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Spezielle Verfügbarkeiten</CardTitle>
                            <Button onClick={() => openModal('specific_date')} className="gap-2">
                                <Plus size={16} /> Datum hinzufügen
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Fügen Sie hier spezielle Verfügbarkeiten für einzelne Tage hinzu, die von den regelmäßigen Zeiten abweichen.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availabilities.filter(a => a.type === 'specific_date').map(slot => (
                                <Card key={slot.id} className="group border-border hover:border-primary/30 transition-colors shadow-sm relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60 group-hover:bg-primary transition-colors"></div>
                                    <CardContent className="p-5 pl-7">
                                        <div className="flex items-center gap-2 font-medium mb-2">
                                            <CalendarIcon size={16} className="text-primary" />
                                            {format(parseISO(slot.specificDate), 'dd. MMMM yyyy', { locale: de })}
                                        </div>
                                        <div className="flex items-center gap-2 text-2xl font-bold">
                                            {slot.startTime} <span className="text-muted-foreground/40 font-light">-</span> {slot.endTime}
                                        </div>
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {slot.batchConfigId ? (
                                                <div title="Vom Admin verwaltet" className="p-2 text-muted-foreground/50 cursor-not-allowed">
                                                    <Trash2 size={16} />
                                                </div>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteAvailability(slot.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {availabilities.filter(a => a.type === 'specific_date').length === 0 && (
                                <div className="col-span-full py-16 text-center border-2 border-dashed border-muted rounded-xl bg-muted/20">
                                    <p className="text-muted-foreground">Keine spezifischen Tage eingetragen.</p>
                                    <Button variant="link" className="mt-2 text-primary" onClick={() => openModal('specific_date')}>
                                        Jetzt einen Tag hinzufügen
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ABSENCES VIEW */}
                {activeTab === 'absences' && (
                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Geplante Abwesenheiten</CardTitle>
                            <Button onClick={() => openModal('time_off')} className="gap-2">
                                <Plus size={16} /> Abwesenheit hinzufügen
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">Blockieren Sie Tage für Urlaub, Krankheit oder sonstige Abwesenheiten. Diese Tage sind nicht buchbar.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {timeOffs.map(toff => (
                                <Card key={toff.id} className="group border-border hover:border-destructive/30 transition-colors shadow-sm relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive/60 group-hover:bg-destructive transition-colors"></div>
                                    <CardContent className="p-5 pl-7">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 font-medium mb-1 text-destructive">
                                                    <CalendarOff size={16} />
                                                    Abwesend
                                                </div>
                                                <div className="font-bold text-lg">
                                                    {format(parseISO(toff.startDate), 'dd.MM.yyyy')}
                                                    {toff.startDate !== toff.endDate && (
                                                        <>
                                                            <span className="mx-2 text-muted-foreground font-light">-</span>
                                                            {format(parseISO(toff.endDate), 'dd.MM.yyyy')}
                                                        </>
                                                    )}
                                                </div>
                                                {toff.reason && (
                                                    <div className="text-sm text-muted-foreground mt-2 italic">
                                                        "{toff.reason}"
                                                    </div>
                                                )}
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteTimeOff(toff.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {timeOffs.length === 0 && (
                                <div className="col-span-full py-16 text-center border-2 border-dashed border-muted rounded-xl bg-muted/20">
                                    <p className="text-muted-foreground">Keine Abwesenheiten geplant.</p>
                                    <Button variant="link" className="mt-2 text-primary" onClick={() => openModal('time_off')}>
                                        Jetzt Abwesenheit eintragen
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Card>

            {/* DIALOG MODAL */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{activeTab === 'absences' ? 'Abwesenheit eintragen' : 'Verfügbarkeit hinzufügen'}</DialogTitle>
                        <DialogDescription>
                            {activeTab === 'absences'
                                ? 'Blockieren Sie einen Zeitraum (z.B. Urlaub).'
                                : 'Fügen Sie einen neuen Zeitraum hinzu, in dem Sie buchbar sind.'}
                        </DialogDescription>
                    </DialogHeader>

                    {activeTab === 'absences' ? (
                        // FORM FOR TIME OFF
                        <form onSubmit={handleSaveTimeOff} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startDate">Von</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={newTimeOff.startDate}
                                        onChange={e => setNewTimeOff({ ...newTimeOff, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">Bis (einschließlich)</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={newTimeOff.endDate}
                                        onChange={e => setNewTimeOff({ ...newTimeOff, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reason">Grund (Optional)</Label>
                                <Input
                                    id="reason"
                                    placeholder="z.B. Urlaub"
                                    value={newTimeOff.reason}
                                    onChange={e => setNewTimeOff({ ...newTimeOff, reason: e.target.value })}
                                />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Abbrechen</Button>
                                <Button type="submit" variant="destructive">Blockieren</Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        // FORM FOR AVAILABILITY
                        <form onSubmit={handleSaveAvailability} className="space-y-4 py-4">
                            {/* TYPE SELECTOR (ONLY IF ROTATING OR SPECIFIC) */}
                            {newItem.type !== 'weekly' && newItem.type !== 'specific_date' && (
                                <div className="space-y-2">
                                    <Label>Zyklus</Label>
                                    <div className="relative">
                                        <select
                                            className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={newItem.type}
                                            onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                        >
                                            <option value="odd_week">Ungerade Woche (KW 1, 3, ...)</option>
                                            <option value="even_week">Gerade Woche (KW 2, 4, ...)</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                            <ChevronLeft className="rotate-[-90deg] h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DATE vs WEEKDAY display */}
                            {newItem.type === 'specific_date' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="date">Datum</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={newItem.specificDate}
                                        onChange={e => setNewItem({ ...newItem, specificDate: e.target.value })}
                                        required
                                    />
                                </div>
                            ) : (
                                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary flex items-center justify-between">
                                    <span className="font-medium">Wochentag:</span>
                                    <span className="font-bold">{days.find(d => d.id === newItem.dayOfWeek)?.label}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start">Startzeit</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                        <Input
                                            id="start"
                                            type="time"
                                            className="pl-9"
                                            value={newItem.startTime}
                                            onChange={e => setNewItem({ ...newItem, startTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end">Endzeit</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                        <Input
                                            id="end"
                                            type="time"
                                            className="pl-9"
                                            value={newItem.endTime}
                                            onChange={e => setNewItem({ ...newItem, endTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* VALID UNTIL (Optional) - Only relevant for recurring rules */}
                            {newItem.type !== 'specific_date' && (
                                <div className="space-y-2 pt-2 border-t">
                                    <Label htmlFor="validUntil">Gültig bis (Optional)</Label>
                                    <div className="relative">
                                        <CalendarOff className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                        <Input
                                            id="validUntil"
                                            type="date"
                                            className="pl-9"
                                            placeholder="Optionales Ablaufdatum"
                                            value={newItem.validUntil}
                                            onChange={e => setNewItem({ ...newItem, validUntil: e.target.value })}
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">Lassen Sie dieses Feld leer, wenn die Regel unbegrenzt gelten soll.</p>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Abbrechen</Button>
                                <Button type="submit">Speichern</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Availability;
