import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, User, Phone, Mail, Trash2, XCircle, ChevronLeft, Archive, RotateCcw, Edit2, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner';

const Appointments = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('current'); // 'current' or 'archived'

    // Contact Inline Edit State
    const [editingBookingId, setEditingBookingId] = useState(null);
    const [editFormData, setEditFormData] = useState({ customerName: '', customerEmail: '', customerPhone: '' });

    // Cancellation Modal State
    const [cancellingBooking, setCancellingBooking] = useState(null);
    const [cancelReasonType, setCancelReasonType] = useState('no_show'); // 'no_show', 'sick', 'other'
    const [customCancelReason, setCustomCancelReason] = useState('');
    const [submittingCancel, setSubmittingCancel] = useState(false);

    const fetchBookings = async (isArchived = false) => {
        setLoading(true);
        try {
            const res = await api.get(`/bookings/mine?archived=${isArchived}`);
            setBookings(res.data);
        } catch (err) {
            console.error(err);
            setError('Fehler beim Laden der Termine');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings(activeTab === 'archived');
    }, [activeTab]);

    const startEditingContact = (booking, e) => {
        if (e) e.stopPropagation();
        setEditingBookingId(booking.id);
        setEditFormData({
            customerName: booking.customerName || '',
            customerEmail: booking.customerEmail || '',
            customerPhone: booking.customerPhone || ''
        });
    };

    const handleSaveContact = async (bookingId, e) => {
        if (e) e.stopPropagation();
        try {
            await api.put(`/bookings/${bookingId}`, editFormData);
            toast.success('Kontaktdaten erfolgreich aktualisiert');
            setEditingBookingId(null);
            fetchBookings(activeTab === 'archived');
        } catch (err) {
            console.error(err);
            toast.error('Fehler beim Speichern: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleCancelContactEdit = (e) => {
        if (e) e.stopPropagation();
        setEditingBookingId(null);
    };

    const openCancelModal = (booking) => {
        setCancellingBooking(booking);
        setCancelReasonType('no_show');
        setCustomCancelReason('');
    };

    const submitCancellation = async (e) => {
        e.preventDefault();
        if (!cancellingBooking) return;
        setSubmittingCancel(true);
        try {
            await api.post(`/bookings/${cancellingBooking.id}/cancel`, {
                reasonType: cancelReasonType,
                customReason: cancelReasonType === 'other' ? customCancelReason : ''
            });
            toast.success('Termin wurde abgesagt und der Kunde wurde benachrichtigt.');
            setCancellingBooking(null);
            fetchBookings(activeTab === 'archived');
        } catch (err) {
            console.error(err);
            toast.error('Fehler beim Absagen: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmittingCancel(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ACHTUNG: Termin endgültig löschen? Dies kann nicht rückgängig gemacht werden.')) return;
        try {
            await api.delete(`/bookings/${id}`);
            fetchBookings(activeTab === 'archived');
        } catch (err) {
            alert('Fehler beim Löschen: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleArchive = async (id) => {
        try {
            await api.post(`/bookings/${id}/archive`);
            fetchBookings(activeTab === 'archived');
        } catch (err) {
            alert('Fehler beim Archivieren: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleUnarchive = async (id) => {
        try {
            await api.post(`/bookings/${id}/unarchive`);
            fetchBookings(activeTab === 'archived');
        } catch (err) {
            alert('Fehler beim Wiederherstellen: ' + (err.response?.data?.error || err.message));
        }
    };

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Calendar size={64} className="text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">Keine Termine vorhanden</h3>
            <p className="text-gray-400 mt-2">In diesem Bereich liegen keine Buchungen vor.</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
                    <ChevronLeft size={20} />
                    <span className="ml-1">Zurück zum Dashboard</span>
                </button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Meine Termine
                </h1>
            </div>

            <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="current">Aktuell</TabsTrigger>
                    <TabsTrigger value="archived">Archiv</TabsTrigger>
                </TabsList>
            </Tabs>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-6 flex items-center gap-2"><XCircle size={20} /> {error}</div>}

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {bookings.map(booking => {
                        const start = parseISO(booking.slotStartTime);
                        const end = parseISO(booking.slotEndTime);
                        const isCancelled = booking.status === 'cancelled';

                        return (
                            <div key={booking.id} className={`group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden relative ${isCancelled ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                                <div className={`h-1.5 w-full ${isCancelled ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} />

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                                            <Calendar size={18} className="text-blue-500" />
                                            <span>{format(start, 'dd. MMMM yyyy', { locale: de })}</span>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isCancelled ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                            {isCancelled ? 'Storniert' : 'Bestätigt'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-2xl font-bold text-gray-800 mb-2">
                                        <Clock size={24} className="text-gray-400" />
                                        {format(start, 'HH:mm', { locale: de })} - {format(end, 'HH:mm', { locale: de })}
                                    </div>
                                    <p className="text-sm font-medium text-primary ml-8 mb-6">{booking.Topic?.title || 'Allgemeiner Termin'}</p>

                                    {editingBookingId === booking.id ? (
                                        <div className="space-y-3 bg-blue-50/70 border border-blue-200 p-4 rounded-lg text-sm" onClick={(e) => e.stopPropagation()}>
                                            <div className="text-xs font-semibold text-blue-700 mb-1">
                                                Kontaktdaten bearbeiten
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User size={16} className="text-blue-500 shrink-0" />
                                                <input
                                                    type="text"
                                                    className="flex-1 px-2.5 py-1.5 bg-white border border-blue-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={editFormData.customerName}
                                                    onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                                                    placeholder="Name des Kunden"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail size={16} className="text-blue-500 shrink-0" />
                                                <input
                                                    type="email"
                                                    className="flex-1 px-2.5 py-1.5 bg-white border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={editFormData.customerEmail}
                                                    onChange={(e) => setEditFormData({ ...editFormData, customerEmail: e.target.value })}
                                                    placeholder="E-Mail-Adresse"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone size={16} className="text-blue-500 shrink-0" />
                                                <input
                                                    type="tel"
                                                    className="flex-1 px-2.5 py-1.5 bg-white border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={editFormData.customerPhone}
                                                    onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                                                    placeholder="Telefonnummer (optional)"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
                                                <button
                                                    type="button"
                                                    onClick={handleCancelContactEdit}
                                                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                                                >
                                                    <X size={14} /> Abbrechen
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleSaveContact(booking.id, e)}
                                                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 shadow-sm transition-colors"
                                                >
                                                    <Check size={14} /> Speichern
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={(e) => startEditingContact(booking, e)}
                                            className="space-y-3 bg-gray-50 hover:bg-blue-50/40 border border-transparent hover:border-blue-200 p-4 rounded-lg text-sm cursor-pointer transition-all relative group/contact"
                                            title="Klicken zum Bearbeiten der Kontaktdaten"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 text-gray-700">
                                                    <User size={16} className="text-gray-400" />
                                                    <span className="font-medium">{booking.customerName}</span>
                                                </div>
                                                <span className="text-xs text-blue-600 flex items-center gap-1 opacity-0 group-hover/contact:opacity-100 transition-opacity">
                                                    <Edit2 size={13} /> Bearbeiten
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-600">
                                                <Mail size={16} className="text-gray-400" />
                                                <span className="truncate">{booking.customerEmail}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-gray-600">
                                                <Phone size={16} className="text-gray-400" />
                                                <span>{booking.customerPhone || <span className="text-gray-400 italic opacity-70">Keine Telefonnummer hinterlegt</span>}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {activeTab === 'current' ? (
                                        <>
                                            <button
                                                onClick={() => handleArchive(booking.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                                title="Ins Archiv verschieben"
                                            >
                                                <Archive size={16} /> Archiv
                                            </button>
                                            {!isCancelled && (
                                                <button
                                                    onClick={() => openCancelModal(booking)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Termin absagen"
                                                >
                                                    <XCircle size={16} /> Absagen
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleUnarchive(booking.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Wiederherstellen"
                                        >
                                            <RotateCcw size={16} /> Wiederherstellen
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDelete(booking.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Dauerhaft löschen"
                                    >
                                        <Trash2 size={16} /> Löschen
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && bookings.length === 0 && <EmptyState />}

            {/* CANCELLATION MODAL */}
            <Dialog open={!!cancellingBooking} onOpenChange={(open) => !open && setCancellingBooking(null)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-destructive flex items-center gap-2">
                            <XCircle className="h-5 w-5" /> Termin absagen
                        </DialogTitle>
                        <DialogDescription>
                            Bitte wählen Sie den Grund für die Absage. Der Kunde erhält eine E-Mail mit Erklärung und einem Link zum schnellen Neubuchen.
                        </DialogDescription>
                    </DialogHeader>

                    {cancellingBooking && (
                        <form onSubmit={submitCancellation} className="space-y-4 py-2">
                            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1 border">
                                <div className="font-semibold text-foreground">{cancellingBooking.Topic?.title || 'Termin'}</div>
                                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                                    <span>{cancellingBooking.customerName} ({cancellingBooking.customerEmail})</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Grund der Absage wählen:</Label>

                                <div className="space-y-2">
                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${cancelReasonType === 'no_show' ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/30'}`}>
                                        <input
                                            type="radio"
                                            name="reasonType"
                                            value="no_show"
                                            checked={cancelReasonType === 'no_show'}
                                            onChange={() => setCancelReasonType('no_show')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <div className="text-sm font-medium">Sie sind nicht zum Termin erschienen</div>
                                            <div className="text-xs text-muted-foreground">Der Kunde erhält eine freundliche Info, dass der Termin verpasst wurde, inkl. Link für einen Ausweichtermin.</div>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${cancelReasonType === 'sick' ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/30'}`}>
                                        <input
                                            type="radio"
                                            name="reasonType"
                                            value="sick"
                                            checked={cancelReasonType === 'sick'}
                                            onChange={() => setCancelReasonType('sick')}
                                            className="mt-1"
                                        />
                                        <div>
                                            <div className="text-sm font-medium">Anbieter ist leider krank</div>
                                            <div className="text-xs text-muted-foreground">Der Kunde erhält eine Information über den krankheitsbedingten Ausfall mit Entschuldigung und Direkt-Link zum Neubuchen.</div>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${cancelReasonType === 'other' ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted/30'}`}>
                                        <input
                                            type="radio"
                                            name="reasonType"
                                            value="other"
                                            checked={cancelReasonType === 'other'}
                                            onChange={() => setCancelReasonType('other')}
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">Sonstiges</div>
                                            <div className="text-xs text-muted-foreground">Eigene Begründung oder Nachricht an den Kunden verfassen.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {cancelReasonType === 'other' && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <Label htmlFor="customReason" className="text-xs font-semibold">Nachricht / Begründung an den Kunden:</Label>
                                    <textarea
                                        id="customReason"
                                        rows={3}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="z.B. Termin muss aus organisatorischen Gründen leider verschoben werden."
                                        value={customCancelReason}
                                        onChange={(e) => setCustomCancelReason(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <DialogFooter className="gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setCancellingBooking(null)}>
                                    Abbrechen
                                </Button>
                                <Button type="submit" variant="destructive" disabled={submittingCancel}>
                                    {submittingCancel ? 'Absagen...' : 'Termin kostenfrei absagen'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Appointments;
