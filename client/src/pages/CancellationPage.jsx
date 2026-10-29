import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
    Calendar,
    Clock,
    User,
    Phone,
    Mail,
    MapPin,
    CheckCircle,
    AlertTriangle,
    AlertCircle,
    ArrowLeft,
    RefreshCw,
    Briefcase,
    XCircle
} from 'lucide-react';

const CancellationPage = () => {
    const { token } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Determine initial role from URL query param (?role=provider or ?role=customer)
    const initialRole = searchParams.get('role') === 'provider' ? 'provider' : 'customer';
    const [role, setRole] = useState(initialRole);

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Customer cancellation state
    const [customerReasonType, setCustomerReasonType] = useState('wrongly_booked'); // 'wrongly_booked', 'wrong_date_time', 'sick_customer', 'other'
    const [customerCustomReason, setCustomerCustomReason] = useState('');

    // Provider cancellation state
    const [providerReasonType, setProviderReasonType] = useState('no_show'); // 'no_show', 'sick', 'other'
    const [providerCustomReason, setProviderCustomReason] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Kein Stornierungs-Token angegeben.');
            setLoading(false);
            return;
        }

        api.get(`/public/cancel-info/${token}`)
            .then(res => {
                setBooking(res.data);
                if (res.data.role) {
                    setRole(res.data.role);
                }
                if (res.data.status === 'cancelled') {
                    setSubmitted(true);
                }
            })
            .catch(err => {
                setError(err.response?.data?.error || 'Buchung konnte nicht geladen werden oder der Link ist ungültig.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [token]);

    const handleCancel = async (e) => {
        e.preventDefault();
        if (!window.confirm('Möchten Sie diesen Termin wirklich unwiderruflich stornieren?')) return;

        setSubmitting(true);
        setError(null);

        const reasonType = role === 'provider' ? providerReasonType : customerReasonType;
        const customReason = role === 'provider'
            ? (providerReasonType === 'other' ? providerCustomReason : '')
            : (customerReasonType === 'other' ? customerCustomReason : '');

        try {
            await api.post('/public/cancel', {
                token,
                role,
                reasonType,
                customReason
            });
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Stornieren des Termins.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatSlotDate = (isoString) => {
        if (!isoString) return '';
        try {
            const date = parseISO(isoString);
            return format(date, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: de });
        } catch {
            return isoString;
        }
    };

    const formatSlotTimeRange = (startIso, endIso) => {
        if (!startIso || !endIso) return '';
        try {
            const start = parseISO(startIso);
            const end = parseISO(endIso);
            return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')} Uhr`;
        } catch {
            return '';
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground text-sm">Termindetails werden abgerufen...</p>
            </div>
        );
    }

    if (error && !booking) {
        return (
            <div className="max-w-md mx-auto my-12 p-6 bg-card border rounded-2xl shadow-sm text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Termin nicht gefunden</h2>
                <p className="text-sm text-muted-foreground mb-6">{error}</p>
                <Link
                    to="/"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <ArrowLeft size={16} className="mr-2" /> Zur Startseite
                </Link>
            </div>
        );
    }

    // Direct Rebooking URL
    const rebookUrl = booking?.providerId && booking?.topicId
        ? `/#/book/${booking.providerId}?topic=${booking.topicId}`
        : booking?.providerId
        ? `/#/book/${booking.providerId}`
        : '/';

    // Already cancelled or successfully submitted
    if (submitted) {
        return (
            <div className="max-w-lg mx-auto my-10 p-6 md:p-8 bg-card border rounded-2xl shadow-sm">
                <div className="text-center">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Termin storniert</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        {role === 'provider'
                            ? 'Der Termin wurde storniert und der Kunde wurde per E-Mail benachrichtigt.'
                            : 'Ihre Buchung wurde erfolgreich storniert. Sie und der Anbieter haben eine Bestätigungs-E-Mail erhalten.'}
                    </p>
                </div>

                {booking && (
                    <div className="bg-muted/40 border rounded-xl p-4 mb-6 text-sm space-y-2">
                        <div className="font-semibold text-foreground text-base border-b pb-2 mb-2">
                            {booking.topicTitle}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                            <Calendar size={16} className="mr-2 shrink-0 text-primary" />
                            <span>{formatSlotDate(booking.slotStartTime)}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                            <User size={16} className="mr-2 shrink-0 text-primary" />
                            <span>Experte: {booking.expertName}</span>
                        </div>
                        {booking.cancellationReason && (
                            <div className="pt-2 text-xs text-muted-foreground border-t mt-2">
                                <span className="font-medium text-foreground">Grund der Stornierung: </span>
                                {booking.cancellationReason}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    {role === 'customer' && (
                        <a
                            href={rebookUrl}
                            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors flex-1"
                        >
                            <RefreshCw size={16} className="mr-2" /> Neuen Termin buchen
                        </a>
                    )}
                    {role === 'provider' && (
                        <Link
                            to="/dashboard/appointments"
                            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors flex-1"
                        >
                            <Briefcase size={16} className="mr-2" /> Zum Dashboard
                        </Link>
                    )}
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent transition-colors flex-1 text-center"
                    >
                        Zur Startseite
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto my-8 px-4">
            <div className="bg-card border rounded-2xl shadow-sm p-6 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Termin absagen</h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            {role === 'provider' ? 'Terminabsage als Anbieter / Experte' : 'Terminstornierung durch Kunde'}
                        </p>
                    </div>
                    <Link
                        to="/"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        <ArrowLeft size={14} /> Startseite
                    </Link>
                </div>

                {error && (
                    <div className="p-3 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Appointment Card */}
                {booking && (
                    <div className="bg-muted/30 border rounded-xl p-4 mb-6">
                        <div className="text-base font-semibold text-gray-900 mb-2">
                            {booking.topicTitle}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center">
                                <Calendar size={15} className="mr-2 shrink-0 text-primary" />
                                <span>{formatSlotDate(booking.slotStartTime)}</span>
                            </div>
                            <div className="flex items-center">
                                <Clock size={15} className="mr-2 shrink-0 text-primary" />
                                <span>{formatSlotTimeRange(booking.slotStartTime, booking.slotEndTime)}</span>
                            </div>
                            <div className="flex items-center">
                                <User size={15} className="mr-2 shrink-0 text-primary" />
                                <span>Experte: {booking.expertName}</span>
                            </div>
                            <div className="flex items-center">
                                <User size={15} className="mr-2 shrink-0 text-primary" />
                                <span>Kunde: {booking.customerName || 'Nicht angegeben'}</span>
                            </div>
                            {booking.location && booking.location !== 'Keine Angabe' && (
                                <div className="flex items-center md:col-span-2">
                                    <MapPin size={15} className="mr-2 shrink-0 text-primary" />
                                    <span>Ort: {booking.location}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}



                {/* Cancellation Form */}
                <form onSubmit={handleCancel} className="space-y-5">
                    {/* Customer Cancellation View */}
                    {role === 'customer' && (
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground block">
                                Warum möchten Sie den Termin stornieren?
                            </label>

                            <div className="space-y-2">
                                <label
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        customerReasonType === 'wrongly_booked'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/40'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="customerReason"
                                        value="wrongly_booked"
                                        checked={customerReasonType === 'wrongly_booked'}
                                        onChange={() => setCustomerReasonType('wrongly_booked')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-foreground">Fälschlicherweise gebucht</div>
                                        <div className="text-xs text-muted-foreground">Der Termin wurde versehentlich oder unabsichtlich gebucht.</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        customerReasonType === 'wrong_date_time'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/40'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="customerReason"
                                        value="wrong_date_time"
                                        checked={customerReasonType === 'wrong_date_time'}
                                        onChange={() => setCustomerReasonType('wrong_date_time')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-foreground">Falsches Datum / Uhrzeit gewählt</div>
                                        <div className="text-xs text-muted-foreground">Ich benötige einen anderen Termin und werde neu buchen.</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        customerReasonType === 'sick_customer'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/40'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="customerReason"
                                        value="sick_customer"
                                        checked={customerReasonType === 'sick_customer'}
                                        onChange={() => setCustomerReasonType('sick_customer')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-foreground">Krank</div>
                                        <div className="text-xs text-muted-foreground">Ich kann den Termin krankheitsbedingt leider nicht wahrnehmen.</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        customerReasonType === 'other'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/40'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="customerReason"
                                        value="other"
                                        checked={customerReasonType === 'other'}
                                        onChange={() => setCustomerReasonType('other')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-foreground">Sonstiges</div>
                                        <div className="text-xs text-muted-foreground">Anderer Grund für die Absage.</div>
                                    </div>
                                </label>
                            </div>

                            {customerReasonType === 'other' && (
                                <div className="pt-2 animate-in fade-in duration-200">
                                    <label htmlFor="customerCustomReason" className="text-xs font-semibold block mb-1">
                                        Begründung (optional):
                                    </label>
                                    <textarea
                                        id="customerCustomReason"
                                        rows={3}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Bitte Grund der Absage kurz beschreiben..."
                                        value={customerCustomReason}
                                        onChange={(e) => setCustomerCustomReason(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Provider Cancellation View (Matches Appointments.jsx) */}
                    {role === 'provider' && (
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-foreground block">
                                Warum sagen Sie den Termin als Anbieter ab?
                            </label>

                            <div className="space-y-2">
                                <label
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        providerReasonType === 'no_show'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/40'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="providerReason"
                                        value="no_show"
                                        checked={providerReasonType === 'no_show'}
                                        onChange={() => setProviderReasonType('no_show')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-foreground">Sie sind nicht zum Termin erschienen</div>
                                        <div className="text-xs text-muted-foreground">Der Kunde erhält eine freundliche Info, dass der Termin verpasst wurde, inkl. Link für einen Ausweichtermin.</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        providerReasonType === 'sick'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/40'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="providerReason"
                                        value="sick"
                                        checked={providerReasonType === 'sick'}
                                        onChange={() => setProviderReasonType('sick')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-foreground">Anbieter ist leider krank</div>
                                        <div className="text-xs text-muted-foreground">Der Kunde erhält eine Information über den krankheitsbedingten Ausfall mit Entschuldigung und Direkt-Link zum Neubuchen.</div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        providerReasonType === 'other'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:bg-muted/40'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="providerReason"
                                        value="other"
                                        checked={providerReasonType === 'other'}
                                        onChange={() => setProviderReasonType('other')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-foreground">Sonstiges</div>
                                        <div className="text-xs text-muted-foreground">Eigene Begründung oder Nachricht an den Kunden verfassen.</div>
                                    </div>
                                </label>
                            </div>

                            {providerReasonType === 'other' && (
                                <div className="pt-2 animate-in fade-in duration-200">
                                    <label htmlFor="providerCustomReason" className="text-xs font-semibold block mb-1">
                                        Nachricht / Begründung an den Kunden:
                                    </label>
                                    <textarea
                                        id="providerCustomReason"
                                        rows={3}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="z.B. Termin muss aus organisatorischen Gründen leider verschoben werden."
                                        value={providerCustomReason}
                                        onChange={(e) => setProviderCustomReason(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit and Cancel Buttons */}
                    <div className="pt-4 flex gap-3">
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center rounded-lg text-sm font-medium h-11 px-4 border border-input bg-background hover:bg-accent transition-colors flex-1"
                        >
                            Abbrechen
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center justify-center rounded-lg text-sm font-semibold h-11 px-4 bg-red-600 text-white hover:bg-red-700 transition-colors flex-1 disabled:opacity-50 shadow-sm"
                        >
                            {submitting ? 'Stornieren...' : 'Termin jetzt absagen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CancellationPage;
