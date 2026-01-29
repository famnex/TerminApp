import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, User, Phone, Mail, Trash2, XCircle, ChevronLeft, Archive, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const Appointments = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('current'); // 'current' or 'archived'

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

    const handleCancel = async (id) => {
        if (!window.confirm('Möchten Sie diesen Termin wirklich stornieren? Der Kunde wird benachrichtigt.')) return;
        try {
            await api.post(`/bookings/${id}/cancel`, { reason: 'Storniert durch Anbieter' });
            fetchBookings(activeTab === 'archived');
        } catch (err) {
            alert('Fehler beim Stornieren: ' + (err.response?.data?.error || err.message));
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
                                    <p className="text-sm text-gray-500 ml-8 mb-6">{booking.Topic?.name || 'Allgemeiner Termin'}</p>

                                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg text-sm">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <User size={16} className="text-gray-400" />
                                            <span className="font-medium">{booking.customerName}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <Mail size={16} className="text-gray-400" />
                                            <span className="truncate">{booking.customerEmail}</span>
                                        </div>
                                        {booking.customerPhone && (
                                            <div className="flex items-center gap-3 text-gray-600">
                                                <Phone size={16} className="text-gray-400" />
                                                <span>{booking.customerPhone}</span>
                                            </div>
                                        )}
                                    </div>
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
                                                    onClick={() => handleCancel(booking.id)}
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
        </div>
    );
};

export default Appointments;
