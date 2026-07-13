# TerminApp - Handbuch und Dokumentation

Dieses Handbuch beschreibt die Funktionsweise, Konfiguration und Pflege der TerminApp. Die Artikel richten sich sowohl an Anwender (Lehrkräfte/Dienstleister) als auch an Systemadministratoren.

---

## Inhaltsverzeichnis
1. [Architektur & Funktionsweise (Entwickler)](#1-architektur--funktionsweise)
2. [Benutzerhandbuch: Termine & Verfügbarkeiten verwalten](#2-benutzerhandbuch-termine--verfügbarkeiten)
3. [LDAP-Integration konfigurieren](#3-ldap-integration)
4. [SSO-JWT-Integration konfigurieren](#4-sso-jwt-integration)
5. [SMTP & E-Mail-Automatisierung](#5-smtp--e-mail-automatisierung)
6. [Sammelverarbeitung (Batch-Prozesse)](#6-sammelverarbeitung)
7. [Wartung & Updates](#7-wartung--updates)

---

## 1. Architektur & Funktionsweise

Die TerminApp ist eine moderne, leichtgewichtige Webanwendung, die als Single-Page-Applikation (SPA) konzipiert ist.

### Technologie-Stack:
*   **Frontend:** React (mit Vite und TailwindCSS).
*   **Backend:** Node.js mit Express.
*   **Datenbank:** SQLite, gesteuert über das ORM Sequelize.
*   **Hintergrunddienste:** `node-cron` für den automatischen E-Mail-Versand von Erinnerungen und Archivierung.

### Ordnerstruktur:
*   `/client`: Der React-Frontend-Quellcode. Im Build-Prozess wird dieser nach `/server/public` kompiliert, um vom Express-Server direkt ausgeliefert zu werden.
*   `/server`: Das Backend. Enthält Routen (`/routes`), Datenbankmodelle (`/models`), Konfigurationen (`/config`) und Update-Skripte (`/scripts`).
*   `/server/database.sqlite`: Die aktive SQLite-Datenbank.
*   `/server/uploads`: Speicherplatz für Logos und Profilbilder.

---

## 2. Benutzerhandbuch: Termine & Verfügbarkeiten

Als Terminanbieter (Lehrkraft / Berater) hast du ein eigenes Dashboard, über welches du deine Buchungsoptionen steuerst.

### Themen & Leistungen anlegen
Damit Kunden Termine bei dir buchen können, musst du mindestens ein Thema (z.B. "Elternsprechtag" oder "Support-Gespräch") anlegen.
1. Navigiere zu **Themen & Leistungen**.
2. Klicke auf **Thema erstellen**.
3. Lege den Titel, eine kurze Beschreibung und die **Dauer in Minuten** fest.

### Verfügbarkeiten einrichten
Das System generiert buchbare Zeitfenster basierend auf deinen Verfügbarkeiten und der Dauer des ausgewählten Themas.
Es gibt verschiedene Typen von Verfügbarkeiten:
*   **Wöchentlich (Weekly):** Ein wiederkehrendes Fenster an einem Wochentag (z.B. jeden Montag von 08:00 bis 10:00 Uhr).
*   **Einmaliges Datum (Specific Date):** Ein Zeitfenster an einem ganz bestimmten Tag (z.B. nur am 15. November).
*   **Ungerade/Gerade Wochen (Odd/Even Week):** Für Stundenpläne, die sich im Zwei-Wochen-Rhythmus abwechseln.
*   **Gültigkeit (Valid Until):** Du kannst festlegen, wie lange eine Regel aktiv ist.

### Terminverwaltung
*   **Buchungen einsehen:** Im Menü **Meine Termine** siehst du alle anstehenden Buchungen deiner Kunden mit Name, E-Mail-Adresse und optionaler Telefonnummer.
*   **Termin absagen:** Du kannst Termine stornieren. Dabei wird der Kunde automatisch benachrichtigt. Ein Absage-Grund kann angegeben werden.
*   **iCal-Integration:** Jede Buchungsbestätigung enthält eine `.ics`-Datei. Klicke darauf, um den Termin direkt in Outlook, Google Calendar oder Apple Calendar zu speichern.

---

## 3. LDAP-Integration

Die TerminApp unterstützt die Benutzerauthentifizierung gegen ein Active Directory / LDAP-Verzeichnis. Wenn LDAP aktiv ist, müssen Benutzer nicht manuell im System angelegt werden, sondern können sich direkt mit ihren Windows-/Schul-Zugangsdaten anmelden.

### Konfiguration (Dashboard -> Einstellungen -> LDAP)
1.  **LDAP aktivieren:** Schalter auf Aktiv setzen.
2.  **Server URL:** Z.B. `ldap://10.0.0.1` oder `ldaps://domain.local` (für SSL).
3.  **Port:** Standardmäßig `389` (unverschlüsselt/STARTTLS) oder `636` (LDAPS).
4.  **Bind DN:** Ein Service-Account, der im Verzeichnis lesen darf. Z.B. `CN=ServiceUser,OU=ServiceAccounts,DC=domain,DC=local`.
5.  **Bind Passwort:** Das Passwort des Service-Accounts.
6.  **Search Base:** Der Pfad, ab dem nach Benutzern gesucht wird. Z.B. `OU=Users,DC=domain,DC=local`.
7.  **Gruppen-Filter (Optional):** Schränkt den Login auf bestimmte Gruppen ein. Z.B. `(memberOf=CN=Lehrer,OU=Groups,DC=domain,DC=local)`.

---

## 4. SSO-JWT-Integration

Über das SSO (Single Sign-On) via JWT können sich Benutzer nahtlos aus Drittanwendungen (z. B. einem Schulportal) an der TerminApp anmelden.

### Ablauf der Anmeldung:
1. Das Drittsystem generiert ein JWT-Token und signiert es mit einem geheimen Schlüssel (**Shared Secret / HS256**).
2. Das Drittsystem leitet den Benutzer auf die TerminApp um: `https://cloud.mso-hef.de/launcher/termin_new/server/public/?sso_token=JWT_TOKEN_HIER`.
3. Die TerminApp verifiziert das Token, liest die Claims (`username`, `email`, `groups`) aus und gleicht den Benutzer ab.
4. Nach dem Login wird der Token-Parameter aus der URL gelöscht, um Missbrauch vorzubeugen.

### Konfiguration (Dashboard -> Einstellungen -> SSO)
*   **SSO aktivieren:** Ermöglicht den Login über URL-Parameter.
*   **SSO JWT Secret:** Das gemeinsame Passwort (Shared Secret) zur Entschlüsselung und Prüfung der Signatur.
*   **URL Parameter Name:** Der Name des Query-Parameters (Standard: `sso_token`).
*   **Abmelde-Weiterleitungs-URL:** Wenn ausgefüllt, werden SSO-Benutzer nach dem Klick auf Abmelden auf diese externe URL geleitet (z.B. zurück zum Hauptportal).
*   **Text für Abmeldebutton:** Ermöglicht die Umbenennung des "Abmelden"-Buttons (z.B. "Zurück zum Portal").

### Gruppenfilter & Formular-Vorausfüllung für Gäste:
*   Wenn ein Benutzer über SSO reinkommt, prüft die App, ob er den im LDAP-Tab konfigurierten **Gruppen-Filter** erfüllt.
*   **Erfüllt (Lehrer/Anbieter):** Der Benutzer wird als regulärer Provider eingeloggt und kann ins Dashboard wechseln.
*   **Nicht erfüllt (Schüler/Gäste):** Der Benutzer wird **nicht** im Backend eingeloggt. Es wird jedoch keine Fehlermeldung angezeigt. Der Benutzer verbleibt auf der öffentlichen Übersichtsseite. Name und E-Mail-Adresse aus dem JWT-Token werden im Browser zwischengespeichert und **beim Ausfüllen des Buchungsformulars automatisch vorausgefüllt**.

---

## 5. SMTP & E-Mail-Automatisierung

Die Anwendung versendet automatische Benachrichtigungen bei Buchungen, Stornierungen und Erinnerungen.

### Konfiguration (Dashboard -> Einstellungen -> SMTP)
*   **Absender E-Mail & Name:** Die Absender-Identität (z.B. `termine@schule.de`).
*   **SMTP Host & Port:** Serveradresse deines E-Mail-Providers (z.B. `smtp.mail.de` und Port `587` oder `465`).
*   **Benutzername & Passwort:** Die Logindaten für das E-Mail-Postfach.
*   **Erinnerungs-Vorlaufzeit:** Globale Einstellung (in Minuten), wie lange vor einem Termin eine automatische Erinnerungs-E-Mail an den Kunden verschickt werden soll (Standard: `10` Minuten, läuft über einen Cronjob im Hintergrund).

---

## 6. Sammelverarbeitung (Batch-Prozesse)

Für Administratoren gibt es unter **Sammelverarbeitung** ein mächtiges Werkzeug, um Regeln für viele Benutzer gleichzeitig zu pflegen.

### Anwendungsfälle:
*   **Einheitliche Verfügbarkeiten:** Erstelle eine Schicht (z.B. "Elternsprechtag am Freitag von 14:00 - 17:00 Uhr") und weise sie allen Benutzern oder einer kompletten Abteilung (z.B. "Fachbereich Englisch") mit einem Klick zu.
*   **Standard-Themen:** Weise neuen Benutzern automatisch Standard-Themen zu (z.B. "Sprechstunde, 30 Minuten").
*   **Automatisches Anwenden:** Aktiviere "Auf zukünftige Benutzer anwenden". Sobald sich ein neuer Benutzer (z.B. via LDAP oder SSO) das erste Mal anmeldet, erhält er diese Themen und Schichten automatisch zugewiesen.

---

## 7. Wartung & Updates

Die Anwendung verfügt über ein integriertes Update-System, das den Administrationsaufwand minimiert.

### Automatisches Update über das Dashboard:
1. Navigiere zu **System Updates**.
2. Ist eine neuere Version auf GitHub verfügbar, klicke auf **Jetzt installieren**.
3. **Der Update-Prozess läuft vollautomatisch:**
   - Die bestehende Datenbank (`database.sqlite`) wird als Backup gesichert (`database.sqlite.bak.TIMESTAMP`).
   - Der neue Code wird per Git geholt.
   - NodeJS-Abhängigkeiten werden aktualisiert (`npm install`).
   - Das Frontend wird für die Produktion neu gebaut (`npm run build`).
   - Der Server führt über PM2 einen Neustart durch (`pm2 reload all`), um den neuen Code im Arbeitsspeicher zu laden.
   - Das Web-Interface lädt sich selbständig neu.
