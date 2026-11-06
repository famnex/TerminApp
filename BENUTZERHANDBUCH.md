# TerminApp - Benutzerhandbuch für Terminanbieter

Dieses Handbuch führt dich Schritt für Schritt durch die Nutzung der TerminApp. Als Anwender (z. B. Lehrkraft, Berater oder Mitarbeiter) kannst du hier deine eigenen Themen, Sprechzeiten und Buchungen selbstständig verwalten.

---

## Inhaltsverzeichnis
*   [Artikel 1: Anmeldung & Erste Schritte](#artikel-1-anmeldung--erste-schritte)
*   [Artikel 2: Profil & Persönliche Einstellungen](#artikel-2-profil--persönliche-einstellungen)
*   [Artikel 3: Themen & Gesprächsanlässe anlegen](#artikel-3-themen--gesprächsanlässe-anlegen)
*   [Artikel 4: Sprechzeiten & Verfügbarkeiten einrichten](#artikel-4-sprechzeiten--verfügbarkeiten-einrichten)
*   [Artikel 5: Termine einsehen und verwalten](#artikel-5-termine-einsehen-und-verwalten)
*   [Artikel 6: Termine absagen / stornieren](#artikel-6-termine-absagen--stornieren)
*   [Artikel 7: Kalender-Synchronisation (Outlook, Google, Apple)](#artikel-7-kalender-synchronisation-outlook-google-apple)

---

## Artikel 1: Anmeldung & Erste Schritte

Um die TerminApp als Anbieter zu nutzen, musst du dich zuerst anmelden:

1.  Öffne die Adresse der TerminApp in deinem Browser.
2.  Klicke oben rechts auf **Anmelden** (oder gehe direkt zur Login-Maske).
3.  Gib deine Zugangsdaten ein:
    *   **SSO / Portal-Login:** Falls deine Organisation ein Hauptportal nutzt, wirst du oft automatisch eingeloggt, wenn du von dort kommst.
    *   **Benutzername & Passwort:** Nutze andernfalls deine bereitgestellten Zugangsdaten (z. B. dein Schul- oder Firmen-Windows-Login).
4.  Nach der Anmeldung befindest du dich auf deiner persönlichen Startseite, dem **Dashboard**.

---

## Artikel 2: Profil & Persönliche Einstellungen

Damit Bucher (z. B. Eltern, Kunden oder Schüler) dich leicht erkennen können, solltest du dein Profil pflegen:

1.  Navigiere im linken Menü zu **Profil**.
2.  **Profilbild:** Lade ein freundliches Foto von dir hoch. Dieses wird den Kunden während des Buchungsprozesses angezeigt.
3.  **Anzeigename:** Überprüfe, ob dein Name richtig geschrieben ist (z. B. *Dr. Max Mustermann* statt *m.mustermann*).
4.  **Kennwort ändern:** Falls du ein lokales Konto nutzt, kannst du hier dein Passwort aktualisieren. (Bei LDAP- oder Portal-Logins wird das Passwort zentral verwaltet).

---

## Artikel 3: Themen & Gesprächsanlässe anlegen

Bevor jemand einen Termin bei dir buchen kann, musst du definieren, **worüber** gesprochen werden kann. Diese Gesprächsanlässe nennen wir **Themen**.

1.  Wähle im Menü den Punkt **Themen & Leistungen**.
2.  Klicke auf die Schaltfläche **Thema erstellen** (oben rechts).
3.  Fülle die folgenden Felder aus:
    *   **Titel:** Ein aussagekräftiger Name (z. B. *Elternsprechstunde*, *Fachberatung*, *IT-Support*).
    *   **Beschreibung (optional):** Beschreibe kurz, worum es geht oder welche Unterlagen mitzubringen sind.
    *   **Dauer (Minuten):** Wie lange soll ein Termin dauern? (z. B. `20` oder `45` Minuten). Das System blockiert bei einer Buchung automatisch genau diese Zeitspanne in deinem Kalender.
4.  Klicke auf **Speichern**. Du kannst beliebig viele verschiedene Themen anbieten.

---

## Artikel 4: Sprechzeiten & Verfügbarkeiten einrichten

Hier legst du fest, **wann** du für Termine zur Verfügung stehst. Das System berechnet daraus automatisch freie Terminfenster.

Gehe zu **Verfügbarkeiten** und klicke auf **Regel hinzufügen**. Du hast drei Möglichkeiten:

### 1. Wöchentlich wiederkehrende Zeiten (Empfohlen)
Verwende dies für deine regulären Sprechzeiten.
*   **Beispiel:** Jeden Dienstag von `09:00` bis `11:00` Uhr.
*   Wähle den Wochentag aus und trage die Start- und Endzeit ein.

### 2. Einmalige, datumsspezifische Zeiten (Spezielle Verfügbarkeiten)
Verwende dies für Sondertermine, die nur an einem bestimmten Tag stattfinden.
*   **Beispiel:** Ein Sonder-Sprechtag nur am `18. Oktober 2026` von `14:00` bis `17:00` Uhr.
*   Wähle das genaue Datum im Kalender und gib die Uhrzeiten ein.
*   Einzelne Verfügbarkeitstage, die bereits komplett in der Vergangenheit liegen, werden zur besseren Übersicht automatisch ausgeblendet und können über den Button **„Vergangene anzeigen“** jederzeit wieder eingeblendet werden.

### 3. Gerade / Ungerade Wochen
Ideal, wenn sich deine Sprechzeiten alle zwei Wochen ändern (z. B. bei wechselndem Dienst- oder Stundenplan).
*   Wähle im Filter zusätzlich aus, ob die Regel nur für **A-Wochen (gerade Kalenderwochen)** oder **B-Wochen (ungerade Kalenderwochen)** gelten soll.

*Tipp: Du kannst Regeln mit einem "Gültig bis"-Datum versehen, damit sie beispielsweise nach dem aktuellen Schulhalbjahr automatisch auslaufen.*

### Abwesenheiten & Urlaub:
Unter dem Reiter **Abwesenheiten** kannst du Zeiten blockieren, an denen du nicht verfügbar bist (z. B. Urlaub, Fortbildung oder Krankheit).
*   Abwesenheiten, die bereits komplett in der Vergangenheit liegen, werden zur besseren Übersicht automatisch ausgeblendet.
*   Über den Button **„Vergangene anzeigen“** kannst du dir bei Bedarf auch vergangene Abwesenheiten jederzeit wieder anzeigen lassen.

---

## Artikel 5: Termine einsehen und verwalten

Wenn jemand einen Termin bei dir bucht, erhältst du automatisch eine Benachrichtigung per E-Mail. Im Dashboard behältst du den Überblick:

1.  Klicke im Menü auf **Meine Termine**.
2.  Hier siehst du eine chronologische Liste aller anstehenden Termine.
3.  **Kunden-Informationen:** Zu jeder Buchung siehst du:
    *   Das gebuchte **Thema**
    *   Den Namen des Buchers
    *   Seine E-Mail-Adresse und ggf. Telefonnummer
    *   Optionale Notizen oder Fragen, die der Kunde bei der Buchung hinterlassen hat.

---

## Artikel 6: Termine absagen / stornieren (Kunde vs. Anbieter)

Die TerminApp unterscheidet präzise, wer einen Termin storniert, und stellt dafür maßgeschneiderte Dialoge und E-Mail-Vorlagen bereit.

### 1. Absage durch den Kunden
*   Der Kunde erhält bei der Buchung einen individuellen Stornierungslink mit seinem persönlichen Kundentoken.
*   Auf der Stornierungsseite wählt der Kunde einen passenden Grund:
    *   **Fälschlicherweise gebucht**
    *   **Falsches Datum / Uhrzeit gewählt**
    *   **Krank**
    *   **Sonstiges (mit optionalem Freitext)**
*   **Benachrichtigungen:**
    *   Der **Kunde** erhält eine Bestätigung der Stornierung samt Direktlink zur Neu-Buchung.
    *   Der **Anbieter (Experte)** erhält eine E-Mail mit den genauen Kundendaten (Name, E-Mail, Telefon) und dem vom Kunden gewählten Absagegrund. Der Zeitslot wird sofort wieder freigegeben.

### 2. Absage durch den Anbieter / Experten
*   Über das Dashboard (**Meine Termine**) oder direkt über den Absagelink aus der Buchungs-E-Mail mit dem anbieterspezifischen Token kann der Anbieter Termine absagen. Die Rolle ist fest an den jeweiligen Link/Token gekoppelt und kann auf der Stornierungsseite nicht manuell geändert werden.
*   Zur Auswahl stehen anbieterspezifische Optionen:
    *   **Kunde ist nicht zum Termin erschienen (No-Show):** Der Kunde wird freundlich informiert mit Link zur Neubuchung.
    *   **Anbieter ist leider krank:** Der Kunde wird über den krankheitsbedingten Ausfall informiert mit Entschuldigung und Buchungslink.
    *   **Sonstiges:** Eigene Begründung oder individuelle Nachricht an den Kunden verfassen.
*   **Benachrichtigungen:**
    *   Der Kunde wird je nach gewählter Option passend informiert.
    *   Der Anbieter erhält eine Bestätigung, dass die Stornierung durchgeführt und der Kunde benachrichtigt wurde.

---

## Artikel 7: Kalender-Synchronisation (Outlook, Google, Apple)

Du musst dich nicht täglich in der TerminApp anmelden, um zu sehen, ob neue Termine anstehen. Du kannst deine Buchungen direkt in deinen persönlichen Kalender übertragen.

### Nutzung über E-Mail-Anhänge (iCal):
*   Bei jeder neuen Buchung schickt dir das System eine E-Mail-Bestätigung.
*   Im Anhang dieser E-Mail befindet sich eine kleine Datei namens **`invite.ics`**.
*   Doppelklicke einfach auf diese Datei in deinem E-Mail-Programm (z. B. Outlook auf dem PC oder Mail auf dem Smartphone), um den Termin mit einem Klick in deinen persönlichen Kalender einzutragen.
*   Auch bei einer Absage erhältst du eine Mail mit einer Aktualisierung, die den Termin aus deinem Kalender wieder entfernt.

## Namensschilder mit Buchungs-QR-Code

Unter **Mein Profil → Namensschild** können Sie „Herr“ oder „Frau“ sowie „Lehrer“, „Lehrerin“, „Schulleitung“ oder einen eigenen Zusatz wählen. Der Nachname wird automatisch aus dem Anzeigenamen bis zum ersten Komma übernommen; ohne Komma wird der gesamte Anzeigename verwendet. **Angaben speichern** merkt sich Anrede und Zusatz unabhängig von der öffentlichen Profilposition.

Die Vorschau zeigt oben das zentrierte Logo und darunter links den QR-Code, rechts daneben linksbündig Name und Zusatz. Der QR-Code führt zur persönlichen Buchungsseite. Bei deaktivierter Buchungsseite erscheint ein Hinweis; aktivieren Sie diese vor Verwendung des Schildes im Profil.

**Drucken** öffnet den Browser-Druckdialog für ein Schild auf A4. Wählen Sie 100 % bzw. „Tatsächliche Größe“ und deaktivieren Sie Kopf-/Fußzeilen. **PDF herunterladen** erzeugt eine PDF-Seite exakt in den eingestellten Schildmaßen, mit 300-dpi-Grafik.

Administratoren legen unter **Einstellungen → Namensschilder** Breite und Höhe in Millimetern (40–200 mm, Vorgabe 90 × 60 mm) sowie das vollständige Logo inklusive Schriftzug fest. PNG und JPEG bis 2 MB werden unterstützt. Nach dem Upload **Schild-Einstellungen speichern** anklicken. Das Logo für Namensschilder ist unabhängig vom Logo im App-Header. Für dauerhaft korrekte QR-Links sollte unter **Schule / Allgemein** die öffentliche Anwendungs-URL inklusive Unterverzeichnis eingetragen sein.

In der **Benutzerverwaltung** öffnet die Schaltfläche **Namensschild** dieselbe Vorschau und Druckfunktion für die ausgewählte Person. Normale Benutzer können ausschließlich ihre eigenen Schild-Angaben lesen und ändern.

### Update durch lokale Lockdateien blockiert

Bis einschließlich 1.25.0 kann `npm install` Änderungen an `package-lock.json` hinterlassen und dadurch das nächste Git-Update blockieren. Im Hauptordner der App lassen sich die betroffenen Dateien vor einem erneuten Update sichern:

```bash
git stash push -m "Lockdateien vor Update sichern" -- package-lock.json client/package-lock.json server/package-lock.json
```

Danach erneut das Update in der App starten. Ab 1.25.1 sichert der Updater veränderte Lockdateien automatisch in einem Git-Stash und protokolliert dessen Commit-ID. Die Sicherung wird nicht automatisch zurückgespielt, damit die neuen Abhängigkeiten verwendet werden. `npm ci` installiert anschließend die festgeschriebenen Versionen für Root, Server und Client, ohne Lockdateien umzuschreiben. Andere lokale Codeänderungen werden nicht automatisch zurückgesetzt; bei Konflikten oder abweichender Git-Historie bricht das Update ab.
