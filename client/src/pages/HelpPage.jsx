import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Users, Calendar, Settings, Clock, RefreshCw, Hexagon, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HelpPage = () => {
    const navigate = useNavigate();

    return (
        <div className="animate-fade-in-up max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Hilfe & Anleitungen</h1>
                    <p className="text-muted-foreground">Dokumentation und Anleitungen zur Nutzung von TerminApp.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Inhaltsverzeichnis
                    </CardTitle>
                    <CardDescription>
                        Klicken Sie auf ein Thema, um die Details anzuzeigen.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">

                        {/* Benutzerverwaltung */}
                        <AccordionItem value="users">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /> Benutzerverwaltung</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Hier verwalten Sie alle Personen, die Zugriff auf das System haben oder Termine anbieten.</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Benutzer anlegen:</strong> Klicken Sie auf "Neuer Benutzer". Sie können wählen, ob die Person ein <em>Administrator</em> (voller Zugriff) oder ein <em>Standard-Benutzer</em> (nur eigene Termine) ist.</li>
                                    <li><strong>Experten-Status:</strong> Nur Benutzer, bei denen "Ist Experte / Kann gebucht werden" aktiviert ist, erscheinen auf der Buchungsseite für Kunden.</li>
                                    <li><strong>Passwort zurücksetzen:</strong> Administratoren können Passwörter für andere Benutzer neu setzen.</li>
                                    <li><strong>LDAP / Active Directory:</strong> Wenn konfiguriert, können sich Benutzer mit ihrem Windows-Login anmelden. Diese werden beim ersten Login automatisch als Standard-Benutzer angelegt.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Verfügbarkeit */}
                        <AccordionItem value="availability">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Clock className="h-5 w-5 text-violet-600" /> Verfügbarkeit & Arbeitszeiten</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Steuern Sie, wann Sie für Kunden buchbar sind.</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Wochenplan:</strong> Setzen Sie Ihre Standardzeiten (z.B. Mo-Fr 08:00 - 16:00).</li>
                                    <li><strong>Gerade / Ungerade Wochen:</strong> Nutzen Sie diese Option, wenn sich Ihre Arbeitszeiten zweiwöchentlich ändern.</li>
                                    <li><strong>Spezifisches Datum:</strong> Überschreiben Sie den Standardplan für bestimmte Tage (z.B. langer Donnerstag am 24.12.).</li>
                                    <li><strong>Abwesenheiten:</strong> Unter "Verfügbarkeit" können Sie auch Urlaub oder Krankheitstage eintragen. Diese Zeiten sind dann für Buchungen gesperrt.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Themen & Leistungen */}
                        <AccordionItem value="topics">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Hexagon className="h-5 w-5 text-amber-600" /> Themen & Leistungen</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Definieren Sie, <em>was</em> gebucht werden kann.</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Jedes Thema hat eine feste <strong>Dauer</strong> (in Minuten).</li>
                                    <li>Themen können bestimmten <strong>Abteilungen</strong> zugewiesen werden.</li>
                                    <li>Wenn ein Thema aktiv ist, können Kunden es im ersten Schritt der Buchung auswählen.</li>
                                    <li><strong>Tipp:</strong> Nutzen Sie sprechende Namen wie "Beratungsgespräch (30 min)" oder "Erstaufnahme".</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Termine */}
                        <AccordionItem value="appointments">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-600" /> Termine verwalten</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Die Übersicht aller gebuchten Termine.</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Stornieren:</strong> Adminstratoren und Experten können Termine absagen. Der Kunde erhält automatisch eine E-Mail.</li>
                                    <li><strong>Vergangene Termine:</strong> Werden ausgegraut dargestellt.</li>
                                    <li><strong>Filter:</strong> Nutzen Sie die Suche, um Buchungen nach Name oder Datum zu finden.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        {/* System Einstellungen */}
                        <AccordionItem value="settings">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Settings className="h-5 w-5 text-slate-600" /> System Einstellungen</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Die globalen Konfigurationen der Anwendung.</p>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-foreground">Allgemein & Design</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>Titel & Logo:</strong> Passen Sie den Namen der App und das Logo an, das oben links angezeigt wird.</li>
                                            <li><strong>Primärfarbe:</strong> Wählen Sie eine HEX-Farbe (z.B. #ff0000), um das gesamte Farb-Schema der Buttons und Akzente an Ihr Branding anzupassen.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">SMTP (E-Mail Versand)</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Damit das System E-Mails (Bestätigungen, Stornos) versenden kann, müssen Sie hier Ihren SMTP-Server hinterlegen.</li>
                                            <li>Testen Sie die Verbindung mit dem "Test E-Mail senden"-Button.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">LDAP / Active Directory</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Verbindet die App mit Ihrem Unternehmensverzeichnis.</li>
                                            <li><strong>Auto-Provisioning:</strong> Wenn sich ein Benutzer mit seinem Windows-Account anmeldet, wird er automatisch als "Standard-Benutzer" im System angelegt.</li>
                                        </ul>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Sammelverarbeitung */}
                        <AccordionItem value="batch">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-600" /> Sammelverarbeitung & Regeln</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Die Sammelverarbeitung ist ein mächtiges Werkzeug, um vielen Benutzern gleichzeitig Themen oder Verfügbarkeiten zuzuweisen. Sie basiert auf **Regeln**.</p>

                                <div className="space-y-4">
                                    <div className="bg-muted/50 p-4 rounded-md border">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">LOGIK</span>
                                            Wie funktionieren Regeln?
                                        </h4>
                                        <p className="text-sm">Eine Regel ist eine "Vorlage" (z.B. "Standard-Arbeitszeit 08:00-16:00" oder "Leistung: Beratung"). Diese Regel wird mit Benutzern oder Abteilungen verknüpft. Solange die Regel aktiv ist, besitzen die verknüpften Benutzer diesen Eintrag.</p>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground">Optionen beim Erstellen</h4>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li>
                                                <strong>Zieltyp (Benutzer vs. Abteilung):</strong>
                                                <br />
                                                Entscheiden Sie, ob Sie explizite Personen auswählen oder eine ganze Abteilung. Bei Abteilungen gilt die Regel für <em>jeden</em>, der Mitglied dieser Abteilung ist.
                                            </li>
                                            <li>
                                                <strong>"Auch für zukünftige Benutzer anwenden" (Auto-Apply):</strong>
                                                <br />
                                                Dies ist die wichtigste Option für Automatisierung.
                                                <ul className="list-circle pl-5 mt-1 space-y-1 text-sm">
                                                    <li><em>Aktiviert:</em> Wenn Sie später einen neuen Benutzer anlegen (oder dieser sich via LDAP einloggt), prüft das System, ob es aktive Regeln mit dieser Option gibt. Falls ja, werden dem neuen Benutzer sofort die entsprechenden Arbeitszeiten/Themen zugewiesen.</li>
                                                    <li><em>Deaktiviert:</em> Die Regel gilt nur für die <strong>jetzt</strong> ausgewählten Benutzer.</li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground">Beispiele</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>Onboarding:</strong> Erstellen Sie eine Regel "Basis-Verfügbarkeit" (Mo-Fr 9-17 Uhr) mit <em>Auto-Apply</em>. Jeder neue Mitarbeiter ist sofort buchbar.</li>
                                            <li><strong>Schließtage:</strong> Erstellen Sie eine Regel "Betriebsausflug" (Bestimmtes Datum, aber keine Zeiten eingetragen = blockiert) und weisen Sie diese der Abteilung "Alle" zu.</li>
                                        </ul>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Updates */}
                        <AccordionItem value="updates">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-pink-600" /> Updates</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Das System verfügt über einen Update-Manager ("Over-the-Air").</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Das System prüft regelmäßig auf GitHub nach neuen Releases.</li>
                                    <li>Mit einem Klick auf "Update installieren" lädt der Server den neuen Code, installiert Abhängigkeiten neu und startet sich selbst neu.</li>
                                    <li>Dabei wird automatisch ein Backup der Datenbank erstellt.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                    </Accordion>
                </CardContent>
            </Card>

            <div className="bg-muted p-4 rounded-lg text-sm text-center">
                <p>Version: {window.APP_VERSION || '1.0.4'} | &copy; {new Date().getFullYear()} TerminApp</p>
                <p className="text-xs text-muted-foreground mt-1">Developed by Steffen Fleischer (famnex)</p>
            </div>
        </div>
    );
};

export default HelpPage;
