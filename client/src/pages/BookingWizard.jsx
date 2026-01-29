import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, isBefore, startOfDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Check, User, Mail, Phone, ArrowLeft, ArrowRight, Share2 } from 'lucide-react';

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { cn } from "../lib/utils"
import { toast } from 'sonner';

const BookingWizard = () => {
    const { userId } = useParams();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [topics, setTopics] = useState([]);

    // Data
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [customerDetails, setCustomerDetails] = useState({ name: '', email: '', phone: '' });
    const [bookingResult, setBookingResult] = useState(null);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Step 1: Fetch Topics
    useEffect(() => {
        api.get(`/public/users/${userId}/topics`)
            .then(res => setTopics(res.data))
            .catch(err => console.error(err));
    }, [userId]);

    // Step 2: Fetch Slots when Topic & Month changes
    useEffect(() => {
        if (step === 2 && selectedTopic) {
            setLoading(true);
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

            api.get(`/public/slots`, {
                params: { userId, topicId: selectedTopic.id, start, end }
            })
                .then(res => setAvailableSlots(res.data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [step, currentMonth, selectedTopic, userId]);

    const handleTopicSelect = (topic) => {
        setSelectedTopic(topic);
        setStep(2);
    };

    const handleDateSelect = (date) => {
        const slotsOnDate = availableSlots.filter(s => s.date === format(date, 'yyyy-MM-dd'));
        if (slotsOnDate.length > 0) {
            setSelectedDate(date);
            setStep(3);
        }
    };

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
        setStep(4);
    };

    const handleBookingSubmit = () => {
        if (!customerDetails.name || !customerDetails.email) {
            alert('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }

        setLoading(true);
        api.post('/public/book', {
            topicId: selectedTopic.id,
            slotTimestamp: selectedSlot.timestamp,
            customerName: customerDetails.name,
            customerEmail: customerDetails.email,
            customerPhone: customerDetails.phone
        })
            .then(res => {
                setBookingResult(res.data);
                setStep(5); // Success Step
            })
            .catch(err => alert('Fehler beim Buchen: ' + (err.response?.data?.error || err.message)))
            .finally(() => setLoading(false));
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link in die Zwischenablage kopiert!");
    };

    // --- Render Helpers ---

    const renderStepper = () => (
        <div className="flex justify-center mb-10">
            <div className="flex items-center space-x-2">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                            step >= s ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground'
                        )}>
                            {step > s ? <Check size={16} /> : s}
                        </div>
                        {s < 4 && <div className={cn(
                            "w-8 sm:w-16 h-1 mx-2 rounded-full transition-all duration-300",
                            step > s ? 'bg-primary' : 'bg-muted'
                        )} />}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Calculate offset for Monday start (Monday=0 ... Sunday=6)
        // new Date(y, m, 1).getDay() returns 0 for Sunday, 1 for Monday...
        // We shift it so 1(Mon) -> 0, 0(Sun) -> 6
        const startDayIndex = (monthStart.getDay() + 6) % 7;

        // Create empty slots for the days before the 1st of the month
        const emptySlots = Array(startDayIndex).fill(null);

        return (
            <Card className="animate-in fade-in zoom-in-95 duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="font-semibold text-lg capitalize">{format(currentMonth, 'MMMM yyyy', { locale: de })}</div>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent>
                    {/* Header: Monday to Sunday */}
                    <div className="grid grid-cols-7 gap-2 text-center mb-4">
                        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                            <div key={d} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {/* Empty cells for offset */}
                        {emptySlots.map((_, index) => (
                            <div key={`empty-${index}`} className="h-10 w-full" />
                        ))}

                        {/* Actual days */}
                        {daysInMonth.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const hasSlots = availableSlots.some(s => s.date === dateStr);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <button
                                    key={dateStr}
                                    onClick={() => hasSlots && handleDateSelect(day)}
                                    disabled={!hasSlots}
                                    className={cn(
                                        "h-10 w-full rounded-md flex items-center justify-center text-sm transition-all duration-200",
                                        isSelected && "bg-primary text-primary-foreground shadow-md scale-110 font-bold",
                                        !isSelected && hasSlots && "bg-secondary text-secondary-foreground hover:bg-primary/20 font-medium cursor-pointer",
                                        !isSelected && !hasSlots && "text-muted-foreground/30 cursor-default",
                                        isToday && !isSelected && "ring-2 ring-primary ring-offset-2"
                                    )}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50/50 py-12 px-4 font-sans text-slate-900">
            <div className="max-w-xl mx-auto">

                {/* Header */}
                <div className="text-center mb-8 space-y-2 relative">
                    <div className="absolute right-0 top-0">
                        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                            <Share2 size={16} />
                            Teilen
                        </Button>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Termin buchen</h1>
                    <p className="text-muted-foreground">Wählen Sie Ihren Wunschtermin in wenigen Schritten.</p>
                </div>

                {renderStepper()}

                <div className="relative">
                    {/* STEP 1: TOPIC */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                            {topics.map(topic => (
                                <Card
                                    key={topic.id}
                                    className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group"
                                    onClick={() => handleTopicSelect(topic)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{topic.title}</CardTitle>
                                        <div className="flex items-center text-xs font-medium bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
                                            <Clock className="w-3 h-3 mr-1" /> {topic.durationMinutes} Min
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{topic.description || "Keine zusätzliche Beschreibung verfügbar."}</p>
                                    </CardContent>
                                </Card>
                            ))}
                            {topics.length === 0 && !loading && (
                                <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground">
                                    Keine Themen für diesen Benutzer verfügbar.
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: DATE */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <h2 className="text-lg font-semibold">Datum wählen</h2>
                            </div>

                            {loading && !availableSlots.length ? (
                                <div className="flex justify-center p-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : renderCalendar()}
                        </div>
                    )}

                    {/* STEP 3: TIME */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => setStep(2)}>
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <h2 className="text-lg font-semibold">Uhrzeit wählen</h2>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardDescription className="flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-primary" />
                                        Verfügbare Zeiten am <span className="font-medium text-foreground">{selectedDate && format(selectedDate, 'dd. MMMM yyyy', { locale: de })}</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {selectedDate && availableSlots
                                            .filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'))
                                            .map(slot => (
                                                <Button
                                                    key={slot.timestamp}
                                                    variant="outline"
                                                    onClick={() => handleSlotSelect(slot)}
                                                    className="w-full hover:bg-primary hover:text-primary-foreground hover:border-primary font-normal"
                                                >
                                                    {slot.time} Uhr
                                                </Button>
                                            ))
                                        }
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* STEP 4: CONTACT */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => setStep(3)}>
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <h2 className="text-lg font-semibold">Kontaktdaten</h2>
                            </div>

                            <Card className="bg-muted/30">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">Thema</div>
                                        <div className="font-medium">{selectedTopic?.title}</div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">Zeitpunkt</div>
                                        <div className="font-medium">{selectedDate && format(selectedDate, 'dd.MM.yyyy')} um {selectedSlot?.time} Uhr</div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Ihr Name *</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                className="pl-9"
                                                placeholder="Max Mustermann"
                                                value={customerDetails.name}
                                                onChange={e => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email-Adresse *</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                className="pl-9"
                                                placeholder="max@beispiel.de"
                                                value={customerDetails.email}
                                                onChange={e => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefonnummer <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                type="tel"
                                                className="pl-9"
                                                placeholder="+49 123 456789"
                                                value={customerDetails.phone}
                                                onChange={e => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" size="lg" onClick={handleBookingSubmit} disabled={loading}>
                                        {loading ? 'Verarbeite Buchung...' : 'Jetzt verbindlich buchen'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    )}

                    {/* STEP 5: SUCCESS */}
                    {step === 5 && (
                        <div className="text-center animate-in zoom-in-95 duration-500 space-y-6">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
                                <Check size={48} className="animate-in zoom-in duration-300 delay-200" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight">Buchung erfolgreich!</h2>
                                <p className="text-muted-foreground text-lg">Vielen Dank, {bookingResult?.booking?.customerName}.</p>
                                <p className="text-muted-foreground">Wir haben eine Bestätigung an <span className="font-medium text-foreground">{bookingResult?.booking?.customerEmail}</span> gesendet.</p>
                            </div>

                            <Button asChild variant="outline" className="mt-8">
                                <Link to="/">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zur Startseite
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingWizard;
