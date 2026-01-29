import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, CheckCircle, AlertTriangle, Play } from 'lucide-react';

import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Switch } from "../components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { toast } from "sonner"

const Settings = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('ldap'); // Default to LDAP or SMTP

    // Test Dialog State
    const [showTestDialog, setShowTestDialog] = useState(false);
    const [showSmtpDialog, setShowSmtpDialog] = useState(false);
    const [testCreds, setTestCreds] = useState({ username: '', password: '' });
    const [testEmailRecipient, setTestEmailRecipient] = useState('');

    // Split result state to avoid crashes
    const [ldapResult, setLdapResult] = useState(null);
    const [smtpResult, setSmtpResult] = useState(null);
    const [testing, setTesting] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Known keys
    const smtpKeys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'smtp_from_email', 'smtp_from_name'];
    const ldapKeys = ['ldap_url', 'ldap_bindDN', 'ldap_bindCredentials', 'ldap_searchBase', 'ldap_searchFilter', 'ldap_enabled', 'ldap_ssl', 'ldap_displayNameAttr', 'ldap_upnSuffix', 'ldap_groupFilter'];

    useEffect(() => {
        if (!user?.isAdmin) {
            navigate('/dashboard');
            return;
        }

        fetchSettings();
    }, [user, navigate]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/admin/settings');
            const settingsMap = {};
            res.data.forEach(s => settingsMap[s.key] = s.value);
            setSettings(settingsMap);
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Laden der Einstellungen.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const promises = Object.keys(settings).map(key =>
                api.post('/admin/settings', { key, value: settings[key] })
            );
            await Promise.all(promises);
            toast.success("Einstellungen erfolgreich gespeichert.");
        } catch (err) {
            console.error(err);
            toast.error("Fehler beim Speichern der Einstellungen.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Correctly handle boolean values from string storage
    const getBoolean = (key) => {
        const val = settings[key];
        return val === true || val === 'true' || val === 1 || val === '1';
    };

    const handleSwitchChange = (name, checked) => {
        setSettings(prev => ({
            ...prev,
            [name]: checked // Store as boolean here, converted to string by backend or next load
        }));
    };

    const runLdapTest = async (e) => {
        e.preventDefault();
        setTesting(true);
        setLdapResult(null);
        try {
            const res = await api.post('/admin/ldap-test', {
                config: settings,
                username: testCreds.username,
                password: testCreds.password
            });
            setLdapResult({ success: true, ...res.data });
            toast.success("Verbindung erfolgreich!");
        } catch (err) {
            setLdapResult({
                success: false,
                error: err.response?.data?.error || err.message,
                details: err.response?.data?.details
            });
            toast.error("Verbindung fehlgeschlagen.");
        } finally {
            setTesting(false);
        }
    };

    const runSmtpTest = async (e) => {
        e.preventDefault();
        setTesting(true);
        setSmtpResult(null);
        try {
            const res = await api.post('/admin/smtp-test', {
                config: settings,
                recipient: testEmailRecipient
            });
            setSmtpResult({ success: true, message: res.data.message });
            toast.success("E-Mail erfolgreich gesendet!");
        } catch (err) {
            setSmtpResult({
                success: false,
                error: err.response?.data?.error || err.message
            });
            toast.error("Senden fehlgeschlagen.");
        } finally {
            setTesting(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);

        setUploadingLogo(true);
        try {
            const res = await api.post('/admin/upload-logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSettings(prev => ({ ...prev, school_logo: res.data.path }));
            toast.success("Logo hochgeladen.");
        } catch (err) {
            console.error(err);
            toast.error("Upload fehlgeschlagen.");
        } finally {
            setUploadingLogo(false);
        }
    };

    const renderField = (key, label, type = 'text', placeholder = '') => (
        <div key={key} className="space-y-2">
            <Label htmlFor={key} className="capitalize">
                {label || key.replace(/_/g, ' ')} {['ldap_url', 'ldap_bindDN'].includes(key) && '*'}
            </Label>
            <Input
                id={key}
                type={type}
                name={key}
                value={settings[key] || ''}
                onChange={handleChange}
                placeholder={placeholder}
            />
        </div>
    );

    const renderToggle = (key, label) => (
        <div className="flex items-center space-x-2 mb-4">
            <Switch
                id={key}
                checked={getBoolean(key)}
                onCheckedChange={(checked) => handleSwitchChange(key, checked)}
            />
            <Label htmlFor={key}>{label}</Label>
        </div>
    );

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-20">
            {/* Header */}
            <div>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="pl-0 text-muted-foreground hover:text-primary mb-4">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Zurück zum Dashboard
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Einstellungen</h1>
                    <p className="text-muted-foreground mt-1">Konfigurieren Sie LDAP, SMTP und Schul-Informationen.</p>
                </div>
            </div>

            {/* Config Tabs */}
            <div className="flex space-x-1 rounded-xl bg-muted p-1 w-full md:w-auto md:inline-flex">
                {['ldap', 'smtp', 'general'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
                            flex-1 md:flex-none inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
                            ${activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'}
                        `}
                    >
                        {tab === 'ldap' ? 'LDAP' : tab === 'smtp' ? 'SMTP' : 'Schule / Allgemein'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSave}>
                <Card className="min-h-[400px]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>
                                {activeTab === 'ldap' && 'LDAP-Konfiguration'}
                                {activeTab === 'smtp' && 'SMTP-Konfiguration'}
                                {activeTab === 'general' && 'Allgemeine Einstellungen'}
                            </CardTitle>
                            <CardDescription className="mt-1.5">
                                {activeTab === 'ldap' && 'Verbinden Sie das System mit Ihrem LDAP-Server.'}
                                {activeTab === 'smtp' && 'Einstellungen für den E-Mail-Versand.'}
                                {activeTab === 'general' && 'Informationen zur Schule und Anwendung.'}
                            </CardDescription>
                        </div>
                        {activeTab === 'ldap' && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowTestDialog(true)} className="gap-2">
                                <Play size={14} /> Verbindung testen
                            </Button>
                        )}
                        {activeTab === 'smtp' && (
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowSmtpDialog(true)} className="gap-2">
                                <Play size={14} /> Test-Email senden
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* LDAP CONTENT */}
                        {activeTab === 'ldap' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {renderToggle('ldap_enabled', 'LDAP aktivieren')}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderField('ldap_url', 'LDAP Server URL', 'text', 'ldap://10.37.128.41')}
                                    {renderField('ldap_port', 'Port', 'number', '389')}
                                </div>

                                {renderToggle('ldap_ssl', 'SSL/TLS verwenden')}
                                {getBoolean('ldap_ssl') && renderToggle('ldap_verify_cert', 'SSL Zertifikat überprüfen (Deaktivieren bei selbstsignierten Zertifikaten)')}

                                <div className="space-y-4 pt-2 border-t">
                                    <h3 className="font-semibold text-sm text-foreground">Bind-Einstellungen</h3>
                                    {renderField('ldap_bindDN', 'Bind DN (Benutzer zum Suchen)', 'text', 'CN=ServiceAccount,OU=ServiceAccounts,DC=schule,DC=local')}
                                    {renderField('ldap_bindCredentials', 'Bind Passwort', 'password')}
                                </div>

                                <div className="space-y-4 pt-2 border-t">
                                    <h3 className="font-semibold text-sm text-foreground">Such- & Zuordnungs-Einstellungen</h3>
                                    {renderField('ldap_searchBase', 'Search Base (Wo suchen?)', 'text', 'DC=schule,DC=local')}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {renderField('ldap_userAttr', 'Benutzer-Attribut (Login Name)', 'text', 'sAMAccountName')}
                                        {renderField('ldap_emailAttr', 'E-Mail-Attribut', 'text', 'mail')}
                                    </div>

                                    {/* NEW FIELDS */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {renderField('ldap_displayNameAttr', 'Anzeigenamen-Attribut', 'text', 'displayName')}
                                        {renderField('ldap_upnSuffix', 'UPN Suffix (Optional, z.B. @schule.local)', 'text')}
                                    </div>

                                    {renderField('ldap_groupFilter', 'Gruppen-Filter (Optional)', 'text', '(memberOf=CN=Lehrer,OU=Groups,DC=schule,DC=local)')}
                                </div>
                            </div>
                        )}

                        {/* SMTP CONTENT */}
                        {activeTab === 'smtp' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {renderToggle('smtp_secure', 'SSL/TLS verwenden')}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderField('smtp_host', 'SMTP Host')}
                                    {renderField('smtp_port', 'SMTP Port', 'number')}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderField('smtp_user', 'Benutzername')}
                                    {renderField('smtp_pass', 'Passwort', 'password')}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
                                    {renderField('smtp_from_email', 'Absender E-Mail Adresse', 'email', 'noreply@schule.de')}
                                    {renderField('smtp_from_name', 'Absender Name', 'text', 'Terminbuchung System')}
                                </div>
                            </div>
                        )}

                        {/* GENERAL CONTENT */}
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {renderField('school_name', 'Schulname')}
                                {renderField('app_url', 'Anwendungs-URL (für Links in E-Mails)')}
                                {renderField('app_title', 'Titel der Anwendung (Header)', 'text', 'TerminApp')}
                                {renderField('primary_color', 'Primärfarbe (App-Design)', 'color', '#7c3aed')}
                                {renderField('reminder_lead_time', 'Erinnerungs-Vorlaufzeit (in Minuten)', 'number', '10')}
                                {renderField('min_booking_notice_hours', 'Minimale Buchungsvorlaufzeit (in Stunden)', 'number', '0')}

                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Schullogo (wird im Header angezeigt)</Label>
                                    <div className="flex items-center gap-4">
                                        {settings.school_logo && (
                                            <div className="relative h-20 w-20 border rounded-md overflow-hidden bg-white/50">
                                                <img src={settings.school_logo} alt="School Logo" className="h-full w-full object-contain" />
                                            </div>
                                        )}
                                        <div className="grid w-full max-w-sm items-center gap-1.5">
                                            <Input id="logo" type="file" onChange={handleLogoUpload} disabled={uploadingLogo} accept="image/*" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Empfohlen: PNG oder SVG, max 2MB.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end border-t bg-muted/20 p-6">
                        <Button type="submit" disabled={saving} size="lg">
                            {saving ? 'Speichere...' : 'Einstellungen speichern'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            {/* TEST LDAP MODAL */}
            <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>LDAP Verbindung testen</DialogTitle>
                        <DialogDescription>
                            Geben Sie Zugangsdaten eines echten Benutzers ein, um Login und Attribut-Zuordnung zu testen.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={runLdapTest} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="testUser">Benutzername</Label>
                            <Input
                                id="testUser"
                                value={testCreds.username}
                                onChange={e => setTestCreds({ ...testCreds, username: e.target.value })}
                                placeholder="z.B. max.mustermann"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="testPass">Passwort</Label>
                            <Input
                                id="testPass"
                                type="password"
                                value={testCreds.password}
                                onChange={e => setTestCreds({ ...testCreds, password: e.target.value })}
                                required
                            />
                        </div>

                        {ldapResult && (
                            <div className={`p-3 rounded-md text-sm ${ldapResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                                {ldapResult.success ? (
                                    <div className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 mt-0.5" />
                                        <div>
                                            <div className="font-semibold">{ldapResult.message}</div>
                                            <div className="mt-1 space-y-0.5 text-xs opacity-90">
                                                <div className="font-mono">DN: {ldapResult.user?.dn}</div>
                                                <div>Name: {ldapResult.user?.displayName}</div>
                                                <div>Mail: {ldapResult.user?.mail}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>{ldapResult.error}</span>
                                    </div>
                                )}
                                {ldapResult.details && (
                                    <div className="mt-2 p-2 bg-black/5 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-40">
                                        {ldapResult.details}
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowTestDialog(false)}>Schließen</Button>
                            <Button type="submit" disabled={testing}>
                                {testing ? 'Teste...' : 'Testen'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* SMTP TEST MODAL */}
            <Dialog open={showSmtpDialog} onOpenChange={setShowSmtpDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>SMTP Verbindung testen</DialogTitle>
                        <DialogDescription>
                            Senden Sie eine Test-E-Mail, um die SMTP-Einstellungen zu überprüfen.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={runSmtpTest} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="testRecipient">Empfänger E-Mail</Label>
                            <Input
                                id="testRecipient"
                                type="email"
                                value={testEmailRecipient}
                                onChange={e => setTestEmailRecipient(e.target.value)}
                                placeholder="ihre@email.de"
                                required
                            />
                        </div>

                        {smtpResult && (
                            <div className={`p-4 rounded-md border text-sm ${smtpResult.success ? 'bg-green-50 text-green-900 border-green-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
                                <div className="flex items-start gap-3">
                                    {smtpResult.success ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />}
                                    <div className="space-y-1">
                                        <div className="font-semibold">
                                            {smtpResult.success ? 'Erfolgreich versendet' : 'Fehler beim Senden'}
                                        </div>
                                        <div className="opacity-90 leading-relaxed">
                                            {smtpResult.success
                                                ? "Die E-Mail wurde erfolgreich von der Anwendung an den SMTP-Server übergeben. Bitte überprüfen Sie den Posteingang (und Spam-Ordner) des Empfängers."
                                                : (smtpResult.message || smtpResult.error)
                                            }
                                        </div>
                                        {smtpResult.success && (
                                            <div className="text-xs text-green-700 pt-1 font-mono">
                                                Server-Antwort: {smtpResult.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowSmtpDialog(false)}>Schließen</Button>
                            <Button type="submit" disabled={testing}>
                                {testing ? 'Sende...' : 'Senden'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Settings;
