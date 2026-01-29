# TerminApp - Appointment Scheduling System

A modern, self-hosted appointment scheduling application for schools, businesses, and organizations.

## Features

### 📅 Booking & Availability
-   **Interactive Calendar:** Easy-to-use booking wizard for clients.
-   **Flexible Availability:** Define recurring weekly slots, specific dates, or odd/even week schedules.
-   **Topics:** Define specific appointment topics (e.g., "Consultation", "Support") with custom durations.
-   **Multi-User:** Manage multiple experts/users with individual schedules.

### 🛡️ Administration & Security
-   **Dashboard:** comprehensive admin interface to manage bookings, users, and settings.
-   **Protected Routes:** Backend routes are secured against unauthorized access.
-   **LDAP/AD Support:** Optional integration with Active Directory for user authentication.
-   **Role Management:** Admin and Standard User roles.

### ⚙️ Automation
-   **Email Notifications:** Automatic confirmations, reminders, and cancellation emails (SMTP).
-   **iCal Integration:** Appointment emails include `.ics` files for calendar integration.
-   **Batch Processing:** Apply availability rules or topics to multiple users or departments at once.
-   **Update Manager:** Integrated system to update the application directly from the dashboard (GitHub + Zip support).

---

## Installation

### Prerequisites
-   **Node.js** (v18 or higher)
-   **Git** (recommended for updates)

### 🐧 Linux Installation

1.  **Download/Clone:**
    ```bash
    git clone https://github.com/famnex/TerminApp.git
    cd TerminApp
    ```
    *Alternatively, upload and unzip the release package.*

2.  **Install Dependencies:**
    ```bash
    # Install dependencies for root, server, and client
    npm install
    ```

3.  **Build Application:**
    ```bash
    # Compiles the frontend for production
    node scripts/build_release.js
    ```
    *(Note: If you downloaded a pre-built Release ZIP, you can skip this step and just run `npm install --production` in the `server` folder)*

4.  **Start Server:**
    ```bash
    cd server
    npm start
    ```
    The application will run on port `3000` by default.

5.  **Setup:**
    Open `http://<your-ip>:3000` in your browser. You will be redirected to the Setup Wizard to create your first admin account.

### 🪟 Windows Installation

1.  **Download:**
    Clone the repository or download the ZIP file and extract it to a folder (e.g., `C:\TerminApp`).

2.  **Install Dependencies:**
    Open PowerShell or Command Prompt in the folder:
    ```powershell
    npm install
    ```

3.  **Build:**
    ```powershell
    node scripts/build_release.js
    ```

4.  **Start:**
    ```powershell
    cd server
    npm start
    ```

5.  **Access:**
    Open `http://localhost:3000` in your browser.

---

## Updates

### Automatic Update (Recommended)
1.  Log in as Administrator.
2.  Go to **Dashboard** -> **Updates**.
3.  If a new version is available, click **Install Update**.
    *The system will automatically back up the database, fetch the new code, rebuild, and restart.*

### Manual Update
1.  Download the latest release ZIP or pull via Git.
2.  Overwrite the files (ensure you keep `server/database.sqlite` and `server/public/uploads`).
3.  Run `npm install` in the server directory.
4.  Restart the application.
