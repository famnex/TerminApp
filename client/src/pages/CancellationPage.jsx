import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

const CancellationPage = () => {
    const { token } = useParams();
    const [reason, setReason] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const handleCancel = () => {
        if (!window.confirm('Möchten Sie den Termin wirklich stornieren?')) return;

        api.post('/public/cancel', { token, reason })
            .then(() => setSubmitted(true))
            .catch(err => setError(err.response?.data?.error || 'Fehler beim Stornieren.'));
    };

    if (submitted) {
        return (
            <div className="card text-center" style={{ maxWidth: '400px', margin: '0 auto' }}>
                <h2 className="text-success mb-4">Termin storniert</h2>
                <p>Ihre Buchung wurde erfolgreich storniert.</p>
                <Link to="/" className="btn btn-primary mt-4">Zur Startseite</Link>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto my-8">
            <div className="border rounded-xl shadow-sm bg-card text-card-foreground p-6">
                <h2 className="text-center mb-4 text-xl font-semibold">Termin stornieren</h2>
                <p className="mb-4 text-sm text-muted-foreground text-center">Bitte geben Sie einen Grund für die Absage an (optional):</p>

                {error && <div className="p-4 mb-4 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

                <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-4"
                    rows="4"
                    placeholder="Grund der Absage..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                />

                <div className="flex gap-4 w-full">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground flex-1"
                    >
                        Abbrechen
                    </Link>
                    <button
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-red-600 text-white hover:bg-red-700 flex-1"
                        onClick={handleCancel}
                    >
                        Jetzt stornieren
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancellationPage;
