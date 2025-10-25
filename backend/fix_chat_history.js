// Fix script to correct the chat_messages_history table structure
// This script fixes the message_type column type mismatch

const { pool } = require('./config/database');
require('dotenv').config();

async function fixChatHistoryTable() {
    const connection = await pool.getConnection();

    try {
        console.log('🔧 Fixing chat_messages_history table structure...');

        // Check if table exists
        const [tables] = await connection.query('SHOW TABLES LIKE "chat_messages_history"');

        if (tables.length === 0) {
            console.log('❌ chat_messages_history table does not exist!');
            return;
        }

        // Check current structure
        const [columns] = await connection.query('DESCRIBE chat_messages_history');
        const columnNames = columns.map(col => col.Field);
        const messageTypeColumn = columns.find(col => col.Field === 'message_type');

        console.log('Current message_type column:', messageTypeColumn);

        // If message_type is still ENUM, we need to change it to VARCHAR(100)
        if (messageTypeColumn && messageTypeColumn.Type.includes('enum')) {
            console.log('📝 Converting message_type from ENUM to VARCHAR(100)...');

            // First, rename the current column
            await connection.query('ALTER TABLE chat_messages_history CHANGE COLUMN message_type message_type_old ENUM("text","image","video","audio","document","location","template","other") NOT NULL');

            // Add new VARCHAR column
            await connection.query('ALTER TABLE chat_messages_history ADD COLUMN message_type VARCHAR(100) NOT NULL DEFAULT "text"');

            // Copy data from old column to new column
            await connection.query('UPDATE chat_messages_history SET message_type = message_type_old');

            // Drop old column
            await connection.query('ALTER TABLE chat_messages_history DROP COLUMN message_type_old');

            console.log('✅ message_type column converted successfully!');
        } else {
            console.log('✅ message_type column is already VARCHAR(100)');
        }

        // Verify the fix
        const [fixedColumns] = await connection.query('DESCRIBE chat_messages_history');
        const fixedMessageTypeColumn = fixedColumns.find(col => col.Field === 'message_type');
        console.log('Fixed message_type column:', fixedMessageTypeColumn);

        console.log('✅ Table structure fixed successfully!');

    } catch (error) {
        console.error('❌ Fix failed:', error.message);

        // Provide manual SQL commands as fallback
        console.log('\n🔧 Manual SQL commands (run these in your database):');
        console.log(`
            ALTER TABLE chat_messages_history CHANGE COLUMN message_type message_type_old ENUM('text','image','video','audio','document','location','template','other') NOT NULL;
            ALTER TABLE chat_messages_history ADD COLUMN message_type VARCHAR(100) NOT NULL DEFAULT 'text';
            UPDATE chat_messages_history SET message_type = message_type_old;
            ALTER TABLE chat_messages_history DROP COLUMN message_type_old;
        `);

    } finally {
        connection.release();
    }
}

// Run fix
fixChatHistoryTable();
