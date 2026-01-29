import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import api from '../api';
import { toast } from "sonner";

const UpdatePage = () => {
    const [status, setStatus] = useState('idle'); // idle, checking, available, up-to-date, installing, error
    const [currentVersion, setCurrentVersion] = useState('');
    const [latestVersion, setLatestVersion] = useState('');
    const [releaseUrl, setReleaseUrl] = useState('');
    const [error, setError] = useState(null);

    const checkForUpdates = async () => {
        setStatus('checking');
        setError(null);
        try {
            const res = await api.get('admin/updates/check');
            setCurrentVersion(res.data.currentVersion);
            setLatestVersion(res.data.latestVersion);
            setReleaseUrl(res.data.releaseUrl);

            if (res.data.updateAvailable) {
                setStatus('available');
            } else {
                setStatus('up-to-date');
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setError('Fehler beim Prüfen auf Updates. Bitte versuchen Sie es später erneut.');
        }
    };

    const handleInstall = async () => {
        if (!confirm('Das Update wird gestartet und der Server neu gestartet. Die Anwendung ist für ca. 1-2 Minuten nicht erreichbar. Fortfahren?')) {
            return;
        }

        setStatus('installing');
        try {
            await api.post('admin/updates/install');
            toast.success("Update gestartet. Bitte warten Sie, bis die Seite neu lädt.");

            // Poll for server availability or just show "Reconnecting..."
            // Since the server restarts, we might lose connection.
            // A simple strategy is to wait 10 seconds then try to reload or ping 'version'
        } catch (err) {
            console.error(err);
            setStatus('available'); // Revert state so they can try again
            setError('Update konnte nicht gestartet werden: ' + (err.response?.data?.error || err.message));
            toast.error("Update fehlgeschlagen.");
        }
    };

    useEffect(() => {
        checkForUpdates();
    }, []);

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">System Update</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Update Manager</CardTitle>
                    <CardDescription>Aktuelle Version: v{currentVersion}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {status === 'checking' && (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p>Prüfe auf Updates...</p>
                        </div>
                    )}

                    {status === 'up-to-date' && (
                        <div className="flex flex-col items-center justify-center py-8 text-green-600">
                            <CheckCircle2 className="h-10 w-10 mb-2" />
                            <p className="font-medium">System ist auf dem neuesten Stand</p>
                            <Button variant="outline" size="sm" onClick={checkForUpdates} className="mt-4">
                                <RefreshCw className="mr-2 h-4 w-4" /> Erneut prüfen
                            </Button>
                        </div>
                    )}

                    {status === 'available' && (
                        <div className="space-y-4">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Neue Version verfügbar: v{latestVersion}</AlertTitle>
                                <AlertDescription>
                                    Ein neues Update ist verfügbar. <br />
                                    <a href={releaseUrl} target="_blank" rel="noopener noreferrer" className="underline">
                                        Release Notes auf GitHub ansehen
                                    </a>
                                </AlertDescription>
                            </Alert>

                            <div className="bg-muted p-4 rounded-md">
                                <h4 className="font-semibold mb-2">Update durchführen:</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                                    <li>Datenbank wird gesichert</li>
                                    <li>Neuer Code wird geladen</li>
                                    <li>Abhängigkeiten werden installiert</li>
                                    <li>Frontend wird neu gebaut</li>
                                    <li>Server wird neu gestartet</li>
                                </ul>
                            </div>

                            <Button onClick={handleInstall} className="w-full">
                                Jetzt installieren (v{latestVersion})
                            </Button>
                        </div>
                    )}

                    {status === 'installing' && (
                        <div className="flex flex-col items-center justify-center py-8 text-blue-600">
                            <Loader2 className="h-10 w-10 animate-spin mb-2" />
                            <p className="font-medium text-lg">Update wird installiert...</p>
                            <p className="text-sm text-muted-foreground mt-2 text-center">
                                Bitte schließen Sie dieses Fenster nicht. <br />
                                Die Anwendung wird in Kürze neu laden.
                            </p>
                            {/* Optional: Add a manual reload button that appears after 30s */}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center py-8 text-red-600">
                            <AlertCircle className="h-10 w-10 mb-2" />
                            <p className="font-medium">Fehler aufgetreten</p>
                            <p className="text-sm text-muted-foreground mt-1">{error}</p>
                            <Button variant="outline" size="sm" onClick={checkForUpdates} className="mt-4">
                                Erneut versuchen
                            </Button>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
};

export default UpdatePage;
