# Datenbank-Dokumentation

Diese Datei dokumentiert die Struktur der Datenbank für die TerminApp.

## Tabellen

### Users
- `id`: INTEGER (Primary Key, Auto-increment)
- `username`: STRING (Unique, Not Null)
- `password`: STRING (Nullable - for LDAP users)
- `displayName`: STRING (Not Null)
- `email`: STRING
- `authMethod`: ENUM('local', 'ldap', 'sso') (Default: 'local')
- `position`: STRING
- `profileImage`: STRING
- `showEmail`: BOOLEAN (Default: true)
- `location`: STRING
- `isAdmin`: BOOLEAN (Default: false)
- `bookingPageActive`: BOOLEAN (Default: false)
- `createdAt`: DATETIME
- `updatedAt`: DATETIME

### Availabilities
- `id`: INTEGER (Primary Key, Auto-increment)
- `type`: ENUM('daily', 'weekly', 'odd_week', 'even_week', 'specific_date') (Not Null)
- `dayOfWeek`: INTEGER (0-6, Nullable)
- `specificDate`: DATEONLY (Nullable)
- `startTime`: STRING (Not Null)
- `endTime`: STRING (Not Null)
- `validUntil`: DATEONLY
- `userId`: INTEGER (Foreign Key -> Users.id)
- `batchConfigId`: INTEGER (Foreign Key -> BatchConfigs.id, On Delete: CASCADE)
- `createdAt`: DATETIME
- `updatedAt`: DATETIME

### Topics
- `id`: INTEGER (Primary Key, Auto-increment)
- `title`: STRING (Not Null)
- `durationMinutes`: INTEGER (Not Null)
- `description`: TEXT
- `userId`: INTEGER (Foreign Key -> Users.id)
- `batchConfigId`: INTEGER (Foreign Key -> BatchConfigs.id, On Delete: CASCADE)
- `createdAt`: DATETIME
- `updatedAt`: DATETIME

### Bookings
- `id`: INTEGER (Primary Key, Auto-increment)
- `cancellationToken`: UUID (Default: UUIDV4, Not Null)
- `slotStartTime`: DATETIME (Not Null)
- `slotEndTime`: DATETIME (Not Null)
- `customerName`: STRING (Not Null)
- `customerEmail`: STRING (Not Null)
- `customerPhone`: STRING
- `status`: ENUM('confirmed', 'cancelled') (Default: 'confirmed')
- `cancellationReason`: STRING
- `reminderSent`: BOOLEAN (Default: false)
- `isArchived`: BOOLEAN (Default: false)
- `topicId`: INTEGER (Foreign Key -> Topics.id)
- `providerId`: INTEGER (Foreign Key -> Users.id)
- `createdAt`: DATETIME
- `updatedAt`: DATETIME

### GlobalSettings
- `key`: STRING (Primary Key, Not Null)
- `value`: TEXT
- `isEncrypted`: BOOLEAN (Default: false)
- `createdAt`: DATETIME
- `updatedAt`: DATETIME

- Bekannte Schlüssel für SSO-JWT-Konfiguration:
  - `sso_enabled`: Gibt an, ob SSO via JWT aktiviert ist (`'true'` oder `'false'`).
  - `sso_jwt_secret`: Das Shared-Secret zur Verifizierung des SSO-JWT-Tokens.
  - `sso_jwt_param`: Der Name des URL-Parameters für den Token (Standard: `'sso_token'`).
  - `sso_logout_redirect`: URL, zu der SSO-Benutzer nach dem Abmelden weitergeleitet werden.
  - `sso_logout_label`: Benutzerdefinierter Text für den Abmeldebutton.

### TimeOffs
- `id`: INTEGER (Primary Key, Auto-increment)
- `startDate`: DATEONLY (Not Null)
- `endDate`: DATEONLY (Not Null)
- `reason`: STRING
- `userId`: INTEGER (Foreign Key -> Users.id)
- `createdAt`: DATETIME
- `updatedAt`: DATETIME

### BatchConfigs
- `id`: INTEGER (Primary Key, Auto-increment)
- `name`: STRING (Not Null)
- `type`: ENUM('topic', 'availability') (Not Null)
- `targetType`: ENUM('user', 'department') (Default: 'user')
- `configData`: JSON (Not Null)
- `applyToFuture`: BOOLEAN (Default: false)
- `createdAt`: DATETIME
- `updatedAt`: DATETIME

### Departments
- `id`: INTEGER (Primary Key, Auto-increment)
- `name`: STRING (Unique, Not Null)
- `description`: STRING
- `createdAt`: DATETIME
- `updatedAt`: DATETIME

### UserDepartments (Junction Table)
- `userId`: INTEGER (Foreign Key -> Users.id)
- `departmentId`: INTEGER (Foreign Key -> Departments.id)

### BatchDepartments (Junction Table)
- `batchConfigId`: INTEGER (Foreign Key -> BatchConfigs.id)
- `departmentId`: INTEGER (Foreign Key -> Departments.id)
