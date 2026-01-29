const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Add targetType to BatchConfigs
    db.run("ALTER TABLE BatchConfigs ADD COLUMN targetType TEXT DEFAULT 'user'", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column targetType already exists.');
            } else {
                console.error('Error adding column:', err.message);
            }
        } else {
            console.log('Column targetType added successfully.');
        }
    });

    // 2. Create BatchDepartments table
    db.run(`
        CREATE TABLE IF NOT EXISTS BatchDepartments (
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL,
            BatchConfigId INTEGER REFERENCES BatchConfigs(id) ON DELETE CASCADE ON UPDATE CASCADE,
            DepartmentId INTEGER REFERENCES Departments(id) ON DELETE CASCADE ON UPDATE CASCADE,
            PRIMARY KEY (BatchConfigId, DepartmentId)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating BatchDepartments table:', err.message);
        } else {
            console.log('BatchDepartments table created successfully.');
        }
    });
});

db.close();
