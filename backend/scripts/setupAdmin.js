// scripts/setupAdmin.js
// Run this script to set up the admin functionality
// Usage: node scripts/setupAdmin.js

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function setupAdmin() {
    let connection;

    try {
        console.log('🔧 Setting up admin functionality...');

        // Connect to database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'whatsapp_templates',
            multipleStatements: true
        });

        console.log('✅ Connected to database');

        // Run migration to add role column
        console.log('📄 Running migration...');
        const migration = `
            -- Add role column to users table
            ALTER TABLE users
            ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user';

            -- Add index for role-based queries
            CREATE INDEX idx_users_role ON users(role);

            -- Update existing users to have 'user' role
            UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';
        `;

        await connection.execute(migration);
        console.log('✅ Migration completed successfully');

        // Create admin user
        console.log('👤 Creating admin user...');
        const adminEmail = 'admin@askmeister.com';
        const adminPassword = 'Admin123!';

        // Check if admin user already exists
        const [existingUsers] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [adminEmail]
        );

        if (existingUsers.length > 0) {
            console.log('ℹ️  Admin user already exists');
        } else {
            // Create admin user
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            // Get the next user ID (max ID + 1)
            const [userMaxIdResult] = await connection.execute('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM users');
            const adminId = userMaxIdResult[0].nextId;

            // Insert user with specific ID
            await connection.execute(
                `INSERT INTO users (id, email, name, password, role, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                [adminId, adminEmail, 'Administrator', hashedPassword, 'admin']
            );

            // Get the next business ID (max ID + 1)
            const [businessMaxIdResult] = await connection.execute('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM businesses');
            const businessId = businessMaxIdResult[0].nextId;

            // Create business for admin
            await connection.execute(
                `INSERT INTO businesses (id, name, description, industry, size, contact_email, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [businessId, 'Admin Business', 'Default business for admin user', 'technology', 'medium', adminEmail]
            );

            // Update user with business_id
            await connection.execute(
                'UPDATE users SET business_id = ? WHERE id = ?',
                [businessId, adminId]
            );

            // Create business settings
            const settingsId = require('uuid').v4();
            await connection.execute(
                `INSERT INTO business_settings (id, business_id, whatsapp_api_token, whatsapp_business_account_id,
                 whatsapp_phone_number_id, facebook_app_id, webhook_verify_token, created_at, updated_at)
                 VALUES (?, ?, '', '', '', '', '', NOW(), NOW())`,
                [settingsId, businessId]
            );

            console.log('✅ Admin user created successfully');
            console.log(`📧 Email: ${adminEmail}`);
            console.log(`🔑 Password: ${adminPassword}`);
        }

        console.log('🎉 Admin setup completed successfully!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Start the backend server: npm start');
        console.log('2. Start the frontend: npm run dev');
        console.log('3. Login with admin credentials');
        console.log('4. Access admin panel from the sidebar');

    } catch (error) {
        console.error('❌ Error setting up admin:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run if called directly
if (require.main === module) {
    setupAdmin();
}

module.exports = { setupAdmin };
