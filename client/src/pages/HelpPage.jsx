import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Users, Calendar, Settings, Clock, RefreshCw, Hexagon, Layers, Lock, LayoutList } from 'lucide-react';
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

                        {/* Buchungsseite (Frontend) */}
                        <AccordionItem value="frontend">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><LayoutList className="h-5 w-5 text-sky-600" /> Buchungsseite & Kunden</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>So sehen Ihre Kunden (Eltern, Studenten) das System:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li><strong>Der Wizard:</strong> Die Buchung erfolgt in einfachen Schritten:
                                        <ol className="list-decimal pl-5 mt-1 space-y-1 text-sm bg-muted/30 p-2 rounded">
                                            <li>Auswahl des Themas (Was?)</li>
                                            <li>Auswahl des Gesprächspartners (Wer?)</li>
                                            <li>Auswahl des Termins (Wann?)</li>
                                            <li>Eingabe der Kontaktdaten & Bestätigung.</li>
                                        </ol>
                                    </li>
                                    <li><strong>iCalendar (ICS):</strong> Nach erfolgreicher Buchung erhalten Kunden (und Sie) eine E-Mail-Bestätigung. Diese enthält eine <code>.ics</code> Datei, mit der der Termin direkt in Outlook, Google Calendar oder Apple Calendar gespeichert werden kann.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Benutzerverwaltung & Abteilungen */}
                        <AccordionItem value="users">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /> Benutzer & Abteilungen</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Verwalten Sie die Struktur Ihrer Organisation.</p>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-foreground">Benutzer</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>Rollen:</strong> <em>Administratoren</em> haben Vollzugriff. <em>Standard-Benutzer</em> verwalten nur sich selbst.</li>
                                            <li><strong>LDAP:</strong> Windows-Logins werden automatisch erkannt und Benutzerkonten erstellt.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">Abteilungen</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li><strong>Zweck:</strong> Gruppieren Sie Nutzer (z.B. "Mathematik", "Sekretariat").</li>
                                            <li><strong>Vorteil:</strong> Sie können Regeln (s.u.) direkt ganzen Abteilungen zuweisen. Alle Mitglieder erben dann diese Einstellungen.</li>
                                            <li><strong>Verwaltung:</strong> Im Reiter "Abteilungen" können Sie Gruppen erstellen und Mitglieder per Klick hinzufügen.</li>
                                        </ul>
                                    </div>
                                </div>
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
                                    <li><strong>Wochenplan & Datum:</strong> Definieren Sie Ihre Zeiten flexibel.</li>
                                    <li>
                                        <strong className="text-amber-600 flex items-center gap-1"><Lock className="h-3 w-3" /> Gesperrte Einträge / Schloss-Symbol:</strong>
                                        <br />
                                        Wenn Sie Einträge mit einem Schloss-Symbol sehen, können diese <strong>nicht gelöscht</strong> werden.
                                        <br />
                                        <em>Grund:</em> Diese Zeiten wurden zentral durch eine <strong>Sammelverarbeitung (Regel)</strong> erstellt. Sie sind für alle betroffenen Nutzer verpflichtend. Nur ein Administrator kann diese Regel ändern oder entfernen.
                                    </li>
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
                                    <li>Themen definieren Dauer und Titel des Angebots.</li>
                                    <li>
                                        <strong className="text-amber-600 flex items-center gap-1"><Lock className="h-3 w-3" /> Gesperrt / Nicht löschbar:</strong>
                                        <br />
                                        Auch hier gilt: Themen mit Schloss-Symbol kommen aus einer zentralen Regel. Wenn z.B. die Schule "Elternsprechtag" für alle festlegt, erscheint dieses Thema bei jedem Lehrer und kann nicht individuell entfernt werden.
                                    </li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Termine */}
                        <AccordionItem value="appointments">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-600" /> Termine & Archiv</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Verwaltung Ihrer Buchungen.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Stornieren:</strong> Informiert Kunden per Mail.</li>
                                    <li><strong>Archivieren:</strong> Verschiebt erledigte Termine ins Archiv.</li>
                                    <li><strong>Wiederherstellen:</strong> Holt Termine aus dem Archiv zurück.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        {/* System Einstellungen */}
                        <AccordionItem value="settings">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Settings className="h-5 w-5 text-slate-600" /> System Einstellungen</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Globale Konfigurationen (Admin).</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>SMTP:</strong> Mail-Server für Bestätigungen & iCals.</li>
                                    <li><strong>LDAP:</strong> Anbindung an Benutzerverzeichnis.</li>
                                    <li><strong>Design:</strong> Logo & Unternehmensfarben.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Sammelverarbeitung */}
                        <AccordionItem value="batch">
                            <AccordionTrigger className="text-lg font-medium">
                                <span className="flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-600" /> Sammelverarbeitung & Regeln</span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground space-y-4 pt-2">
                                <p>Zentrale Steuerung für viele Nutzer.</p>

                                <div className="space-y-4">
                                    <div className="bg-muted/50 p-4 rounded-md border">
                                        <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">MÄCHTIG</span>
                                            Das Prinzip der Regeln
                                        </h4>
                                        <p className="text-sm">Regeln erstellen Einträge bei Benutzern. Solange die Regel existiert, "erwingt" sie diese Einträge. Deshalb erscheinen sie bei den Nutzern als <strong>gesperrt (Schloss-Symbol)</strong> und können dort nicht gelöscht werden.</p>
                                    </div>

                                    <div>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li><strong>Abteilungen nutzen:</strong> Weisen Sie eine Regel einer Abteilung zu (z.B. "Alle Lehrer"). Jeder, der in die Abteilung kommt, erhält sofort die Arbeitszeiten/Themen.</li>
                                            <li><strong>Auto-Update:</strong> Ändern Sie die Regel zentral (z.B. Dauer von 30 auf 45 Min), wird dies sofort bei allen verknüpften Nutzern aktualisiert.</li>
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
                                <p>Das System aktualisiert sich automatisch über GitHub Releases, inkl. Datenbank-Backups.</p>
                            </AccordionContent>
                        </AccordionItem>

                    </Accordion>
                </CardContent>
            </Card>

            <div className="bg-muted p-4 rounded-lg text-sm text-center">
                <p>Version: {window.APP_VERSION || '1.0.6'} | &copy; {new Date().getFullYear()} TerminApp</p>
                <p className="text-xs text-muted-foreground mt-1">Developed by Steffen Fleischer (famnex)</p>
            </div>
        </div>
    );
};

export default HelpPage;
