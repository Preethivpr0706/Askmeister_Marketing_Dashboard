// Database migration script to add chatbot message columns
// Run this once to update the chat_messages table

const { pool } = require('./config/database');
require('dotenv').config();

async function addChatbotColumns() {
  const connection = await pool.getConnection();

  try {
    console.log('Adding chatbot columns to chat_messages table...');

    // Check if columns exist first
    const [columns] = await connection.query('DESCRIBE chat_messages');
    const columnNames = columns.map(col => col.Field);

    // Add missing columns
    const migrations = [];

    if (!columnNames.includes('is_campaign')) {
      migrations.push(`
        ALTER TABLE chat_messages
        ADD COLUMN is_campaign BOOLEAN DEFAULT FALSE
      `);
    }

    if (!columnNames.includes('campaign_id')) {
      migrations.push(`
        ALTER TABLE chat_messages
        ADD COLUMN campaign_id VARCHAR(255) NULL
      `);
    }

    if (!columnNames.includes('is_auto_reply')) {
      migrations.push(`
        ALTER TABLE chat_messages
        ADD COLUMN is_auto_reply BOOLEAN DEFAULT FALSE
      `);
    }

    if (!columnNames.includes('auto_reply_id')) {
      migrations.push(`
        ALTER TABLE chat_messages
        ADD COLUMN auto_reply_id VARCHAR(255) NULL
      `);
    }

    if (!columnNames.includes('interactive_data')) {
      migrations.push(`
        ALTER TABLE chat_messages
        ADD COLUMN interactive_data TEXT NULL
      `);
    }

    // Execute migrations
    for (const migration of migrations) {
      console.log('Executing:', migration);
      await connection.query(migration);
    }

    console.log('✅ Chatbot columns added successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Provide manual SQL commands as fallback
    console.log('\n🔧 Manual SQL commands (run these in your database):');
    console.log(`
      ALTER TABLE chat_messages
      ADD COLUMN is_campaign BOOLEAN DEFAULT FALSE,
      ADD COLUMN campaign_id VARCHAR(255) NULL,
      ADD COLUMN is_auto_reply BOOLEAN DEFAULT FALSE,
      ADD COLUMN auto_reply_id VARCHAR(255) NULL,
      ADD COLUMN interactive_data TEXT NULL;
    `);

  } finally {
    connection.release();
  }
}

// Run migration
addChatbotColumns();
