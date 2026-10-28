import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, publicSettings } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState('');

    const directIdpUrl = publicSettings?.directIdpLogin ? publicSettings?.idpLoginUrl : null;
    const allowLocalFallback = searchParams.get('local') === '1' || searchParams.get('fallback') === '1';

    useEffect(() => {
        if (directIdpUrl && !allowLocalFallback) {
            window.location.href = directIdpUrl;
        }
    }, [directIdpUrl, allowLocalFallback]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await login(username, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Anmeldung fehlgeschlagen. Bitte prüfen Sie Ihre Daten.');
        }
    };

    if (directIdpUrl && !allowLocalFallback) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Card className="w-full max-w-md text-center p-6 space-y-4">
                    <CardHeader>
                        <CardTitle>Weiterleitung zur Anmeldung</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Sie werden automatisch zum Identity Provider weitergeleitet...
                        </p>
                        <Button asChild className="w-full gap-2">
                            <a href={directIdpUrl}>
                                <ExternalLink size={16} /> Direkt zum Identity Provider
                            </a>
                        </Button>
                        <div className="pt-2 text-xs text-muted-foreground">
                            Lokale Anmeldung benötigt? <a href="#/admin?local=1" className="underline hover:text-primary">Lokales Anmeldeformular öffnen</a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Admin Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-4 mb-4 bg-red-100 text-red-700 rounded text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="username">Benutzername / Email</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Passwort</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Anmelden
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminLogin;
