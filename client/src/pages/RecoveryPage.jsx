import React, { useState } from 'react';
import api from '../api';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const RecoveryPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(false);
        setMessage('');

        try {
            const res = await api.post('/public/recover', { email });
            setMessage(res.data.message);
        } catch (err) {
            setError(true);
            setMessage('Fehler beim Senden. Bitte überprüfen Sie Ihre Eingabe.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto animate-fade-in-up pt-12">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Buchungen finden</CardTitle>
                    <CardDescription>
                        Geben Sie Ihre E-Mail-Adresse ein, um Links zu Ihren aktuellen Buchungen zu erhalten.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {message && !error ? (
                        <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200 flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                            <p className="text-sm">{message}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {message}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">E-Mail Adresse</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@beispiel.de"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Wird gesendet...' : 'Link senden'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default RecoveryPage;
