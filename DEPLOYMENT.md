# Deployment-Anleitung

Dieses Projekt ist für die einfache Bereitstellung mit **Docker** konfiguriert.

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) und [Docker Compose](https://docs.docker.com/compose/install/) müssen auf dem Server installiert sein.

## Erstellen des Release-Pakets (Lokal)

Bevor Sie die Anwendung auf den Server laden, müssen Sie das Release-Paket erstellen. Dies kompiliert den Frontend-Code und bündelt ihn mit dem Server.

1.  **Abhängigkeiten installieren**:
    Im Hauptverzeichnis des Projekts (Lokal):
    ```bash
    npm install
    ```

2.  **Release bauen**:
    Führen Sie das Build-Skript aus:
    ```bash
    node scripts/build_release.js
    ```
    
    Dies erstellt:
    -   Einen Ordner `dist/` mit den vorbereiteten Server-Dateien.
    -   Eine Datei `appointment-app-release.zip`, die Sie einfach auf den Server hochladen können.

## Installation & Start

1.  **Repository klonen** (oder Dateien auf den Server kopieren):
    ```bash
    git clone <repository-url>
    cd appointment-app
    ```

2.  **Umgebungsvariablen konfigurieren** (Optional):
    Passen Sie die Variablen in `docker-compose.yml` an, falls nötig (z.B. Ports oder LDAP-Einstellungen).
    *Hinweis: SQLite-Datenbank und Uploads werden lokal in den Ordnern `./server/database.sqlite` und `./uploads` gespeichert.*

3.  **Starten**:
    Führen Sie folgenden Befehl aus, um die App zu bauen und im Hintergrund zu starten:
    ```bash
    docker-compose up -d --build
    ```

    Die App ist nun unter `http://<server-ip>:3000` erreichbar.

## Updates einspielen

Um die App zu aktualisieren (z.B. nach Code-Änderungen), führen Sie einfach diese Schritte aus:

1.  **Neuen Code holen**:
    ```bash
    git pull
    ```

2.  **Neu bauen und starten**:
    ```bash
    docker-compose up -d --build
    ```
    Docker erkennt Änderungen, baut das Image neu und ersetzt den laufenden Container automatisch. Daten (Datenbank & Uploads) bleiben erhalten.

## Alternative: ZIP-Installation

Falls Sie Docker nicht nutzen möchten, können Sie auch das vorgefertigte ZIP-Paket verwenden.

1.  **Entpacken**: Laden Sie die `appointment-app-release.zip` auf Ihren Server und entpacken Sie sie.
2.  **Abhängigkeiten installieren**:
    Öffnen Sie ein Terminal im entpackten Ordner und führen Sie aus:
    ```bash
    cd server
    npm install --production
    ```
3.  **Starten**:
    ```bash
    npm start
    ```
4.  **Einrichtung**:
    Öffnen Sie `http://<server-ip>:3000` im Browser. Da dies der erste Start ist, werden Sie automatisch zum **Einrichtungs-Assistenten** weitergeleitet, um das Administrator-Konto zu erstellen.

## Troubleshooting

-   **Logs anzeigen**:
    ```bash
    docker-compose logs -f
    ```
-   **Container stoppen**:
    ```bash
    docker-compose down
    ```
