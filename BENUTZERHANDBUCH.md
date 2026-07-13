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

### 2. Einmalige, datumsspezifische Zeiten
Verwende dies für Sondertermine, die nur an einem bestimmten Tag stattfinden.
*   **Beispiel:** Ein Sonder-Sprechtag nur am `18. Oktober 2026` von `14:00` bis `17:00` Uhr.
*   Wähle das genaue Datum im Kalender und gib die Uhrzeiten ein.

### 3. Gerade / Ungerade Wochen
Ideal, wenn sich deine Sprechzeiten alle zwei Wochen ändern (z. B. bei wechselndem Dienst- oder Stundenplan).
*   Wähle im Filter zusätzlich aus, ob die Regel nur für **A-Wochen (gerade Kalenderwochen)** oder **B-Wochen (ungerade Kalenderwochen)** gelten soll.

*Tipp: Du kannst Regeln mit einem "Gültig bis"-Datum versehen, damit sie beispielsweise nach dem aktuellen Schulhalbjahr automatisch auslaufen.*

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

## Artikel 6: Termine absagen / stornieren

Falls du krank wirst oder ein dringender Termin dazwischenkommt, kannst du gebuchte Termine absagen. Die App übernimmt die Kommunikation für dich.

1.  Gehe unter **Meine Termine** zu dem Termin, den du stornieren musst.
2.  Klicke neben dem Eintrag auf **Absagen** (Mülltonnen-Symbol oder Storno-Button).
3.  **Absagegrund:** Gib kurz an, warum der Termin entfällt (z. B. *„Verschiebung wegen Krankheit – Bitte buchen Sie einen Ersatztermin“*).
4.  Klicke auf **Stornieren bestätigen**.
5.  Der Kunde erhält sofort eine automatische E-Mail über die Absage, die auch deinen persönlichen Absagegrund enthält. Das Zeitfenster wird in deinem Kalender sofort wieder freigegeben.

---

## Artikel 7: Kalender-Synchronisation (Outlook, Google, Apple)

Du musst dich nicht täglich in der TerminApp anmelden, um zu sehen, ob neue Termine anstehen. Du kannst deine Buchungen direkt in deinen persönlichen Kalender übertragen.

### Nutzung über E-Mail-Anhänge (iCal):
*   Bei jeder neuen Buchung schickt dir das System eine E-Mail-Bestätigung.
*   Im Anhang dieser E-Mail befindet sich eine kleine Datei namens **`invite.ics`**.
*   Doppelklicke einfach auf diese Datei in deinem E-Mail-Programm (z. B. Outlook auf dem PC oder Mail auf dem Smartphone), um den Termin mit einem Klick in deinen persönlichen Kalender einzutragen.
*   Auch bei einer Absage erhältst du eine Mail mit einer Aktualisierung, die den Termin aus deinem Kalender wieder entfernt.
