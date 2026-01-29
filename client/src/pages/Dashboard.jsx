import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Settings, Clock, Users, LogOut, Tags, Layers, RefreshCw, BookOpen } from 'lucide-react';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="animate-fade-in-up max-w-5xl mx-auto space-y-8 pb-20">
            <div className="flex justify-between items-end border-b pb-6">
                <div>
                    <p className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-1">Dashboard</p>
                    <h1 className="text-3xl font-bold tracking-tight">Willkommen zurück, <span className="text-primary">{user?.displayName}</span></h1>
                </div>
                <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-destructive gap-2">
                    <LogOut size={20} /> Abmelden
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Appointments Card */}
                <Card
                    onClick={() => navigate('/dashboard/appointments')}
                    className="cursor-pointer hover:border-blue-500/50 transition-all hover:shadow-md group"
                >
                    <CardHeader className="space-y-0 pb-2">
                        <div className="p-3 w-fit bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <Calendar size={24} />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <CardTitle className="text-xl mb-2 group-hover:text-blue-600 transition-colors">Meine Termine</CardTitle>
                        <p className="text-sm text-muted-foreground">Verwalte deine anstehenden Buchungen, sehe Details ein oder storniere bei Bedarf.</p>
                    </CardContent>
                </Card>

                {/* Availability Card */}
                <Card
                    onClick={() => navigate('/dashboard/availability')}
                    className="cursor-pointer hover:border-violet-500/50 transition-all hover:shadow-md group"
                >
                    <CardHeader className="space-y-0 pb-2">
                        <div className="p-3 w-fit bg-violet-50 dark:bg-violet-900/20 rounded-xl text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                            <Clock size={24} />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <CardTitle className="text-xl mb-2 group-hover:text-violet-600 transition-colors">Verfügbarkeiten</CardTitle>
                        <p className="text-sm text-muted-foreground">Definiere deine Arbeitszeiten, Schichten und freie Tage für die Buchung.</p>
                    </CardContent>
                </Card>

                {/* Topics Card (All Users) */}
                <Card
                    onClick={() => navigate('/dashboard/topics')}
                    className="cursor-pointer hover:border-amber-500/50 transition-all hover:shadow-md group"
                >
                    <CardHeader className="space-y-0 pb-2">
                        <div className="p-3 w-fit bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                            <Tags size={24} />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <CardTitle className="text-xl mb-2 group-hover:text-amber-600 transition-colors">Themen & Leistungen</CardTitle>
                        <p className="text-sm text-muted-foreground">Verwalte die buchbaren Themen und deren Dauer (z.B. Strategiegespräch, 30min).</p>
                    </CardContent>
                </Card>

                {/* Users Card (Admin Only) */}
                {user?.isAdmin && (
                    <Card
                        onClick={() => navigate('/dashboard/users')}
                        className="cursor-pointer hover:border-emerald-500/50 transition-all hover:shadow-md group"
                    >
                        <CardHeader className="space-y-0 pb-2">
                            <div className="p-3 w-fit bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                                <Users size={24} />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <CardTitle className="text-xl mb-2 group-hover:text-emerald-600 transition-colors">Benutzerverwaltung</CardTitle>
                            <p className="text-sm text-muted-foreground">Lege neue Benutzer an, bearbeite Profile und verwalte Zugriffsrechte.</p>
                        </CardContent>
                    </Card>
                )}

                {/* Settings Card (Admin Only) */}
                {user?.isAdmin && (
                    <Card
                        onClick={() => navigate('/dashboard/settings')}
                        className="cursor-pointer hover:border-slate-500/50 transition-all hover:shadow-md group"
                    >
                        <CardHeader className="space-y-0 pb-2">
                            <div className="p-3 w-fit bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 group-hover:bg-slate-700 group-hover:text-white transition-colors duration-300">
                                <Settings size={24} />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <CardTitle className="text-xl mb-2 group-hover:text-slate-700 transition-colors">System Einstellungen</CardTitle>
                            <p className="text-sm text-muted-foreground">Konfiguriere SMTP-Server, LDAP-Anbindung und globale Parameter.</p>
                        </CardContent>
                    </Card>
                )}

                {/* Batch Processing Card (Admin Only) */}
                {user?.isAdmin && (
                    <Card
                        onClick={() => navigate('/dashboard/batch')}
                        className="cursor-pointer hover:border-indigo-500/50 transition-all hover:shadow-md group"
                    >
                        <CardHeader className="space-y-0 pb-2">
                            <div className="p-3 w-fit bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                <Layers size={24} />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <CardTitle className="text-xl mb-2 group-hover:text-indigo-600 transition-colors">Sammelverarbeitung</CardTitle>
                            <p className="text-sm text-muted-foreground">Regeln für Themen und Verfügbarkeiten erstellen.</p>
                        </CardContent>
                    </Card>
                )}

                {/* Updates Card (Admin Only) */}
                {user?.isAdmin && (
                    <Card
                        onClick={() => navigate('/dashboard/updates')}
                        className="cursor-pointer hover:border-pink-500/50 transition-all hover:shadow-md group"
                    >
                        <CardHeader className="space-y-0 pb-2">
                            <div className="p-3 w-fit bg-pink-50 dark:bg-pink-900/20 rounded-xl text-pink-600 dark:text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition-colors duration-300">
                                <RefreshCw size={24} />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <CardTitle className="text-xl mb-2 group-hover:text-pink-600 transition-colors">System Updates</CardTitle>
                            <p className="text-sm text-muted-foreground">App-Version prüfen, Updates installieren und verwalten.</p>
                        </CardContent>
                    </Card>
                )}

                {/* Help Card (All Users) */}
                <Card
                    onClick={() => navigate('/dashboard/help')}
                    className="cursor-pointer hover:border-teal-500/50 transition-all hover:shadow-md group"
                >
                    <CardHeader className="space-y-0 pb-2">
                        <div className="p-3 w-fit bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                            <BookOpen size={24} />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <CardTitle className="text-xl mb-2 group-hover:text-teal-600 transition-colors">Hilfe & Anleitungen</CardTitle>
                        <p className="text-sm text-muted-foreground">Dokumentation, FAQs und Anleitungen zur Nutzung.</p>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};

export default Dashboard;
