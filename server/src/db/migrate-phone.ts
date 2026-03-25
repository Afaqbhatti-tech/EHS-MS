import { query } from './connection.js';

async function migratePhone() {
  console.log('Adding phone column to users table...');

  try {
    // Check if column already exists
    const cols: any[] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'`
    );

    if (cols.length > 0) {
      console.log('phone column already exists — skipping.');
    } else {
      await query(`ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT NULL AFTER email`);
      console.log('phone column added successfully.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migratePhone();
