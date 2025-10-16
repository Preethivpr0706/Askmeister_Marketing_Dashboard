const { pool } = require('./config/database');

async function migrateChatbotImprovements() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Running chatbot improvements migration...');
    
    // Check if interactive_data column exists
    const [interactiveColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'chat_messages' 
      AND COLUMN_NAME = 'interactive_data'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (interactiveColumns.length === 0) {
      await connection.query(`
        ALTER TABLE chat_messages 
        ADD COLUMN interactive_data JSON DEFAULT NULL
      `);
      console.log('✅ Added interactive_data column');
    } else {
      console.log('ℹ️ interactive_data column already exists');
    }
    
    // Check if is_bot column exists
    const [botColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'chat_messages' 
      AND COLUMN_NAME = 'is_bot'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (botColumns.length === 0) {
      await connection.query(`
        ALTER TABLE chat_messages 
        ADD COLUMN is_bot BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added is_bot column');
    } else {
      console.log('ℹ️ is_bot column already exists');
    }
    
    // Check if chatbot tables exist
    const [flowTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'chatbot_flows'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (flowTables.length === 0) {
      // Create chatbot_flows table
      await connection.query(`
        CREATE TABLE chatbot_flows (
          id VARCHAR(36) PRIMARY KEY,
          business_id VARCHAR(36) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Created chatbot_flows table');
    } else {
      console.log('ℹ️ chatbot_flows table already exists');
    }
    
    const [nodeTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'chatbot_nodes'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (nodeTables.length === 0) {
      // Create chatbot_nodes table
      await connection.query(`
        CREATE TABLE chatbot_nodes (
          id VARCHAR(36) PRIMARY KEY,
          flow_id VARCHAR(36) NOT NULL,
          type VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          position_x INT NOT NULL,
          position_y INT NOT NULL,
          metadata JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flow_id) REFERENCES chatbot_flows(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Created chatbot_nodes table');
    } else {
      console.log('ℹ️ chatbot_nodes table already exists');
    }
    
    const [edgeTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'chatbot_edges'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (edgeTables.length === 0) {
      // Create chatbot_edges table
      await connection.query(`
        CREATE TABLE chatbot_edges (
          id VARCHAR(36) PRIMARY KEY,
          flow_id VARCHAR(36) NOT NULL,
          source_node_id VARCHAR(36) NOT NULL,
          target_node_id VARCHAR(36) NOT NULL,
          condition TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flow_id) REFERENCES chatbot_flows(id) ON DELETE CASCADE,
          FOREIGN KEY (source_node_id) REFERENCES chatbot_nodes(id) ON DELETE CASCADE,
          FOREIGN KEY (target_node_id) REFERENCES chatbot_nodes(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Created chatbot_edges table');
    } else {
      console.log('ℹ️ chatbot_edges table already exists');
    }
    
    // Check if conversation chatbot columns exist
    const [conversationColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'conversations' 
      AND COLUMN_NAME IN ('is_bot_active', 'current_node_id', 'bot_flow_id')
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const existingColumns = conversationColumns.map(col => col.COLUMN_NAME);
    
    if (!existingColumns.includes('is_bot_active')) {
      await connection.query(`
        ALTER TABLE conversations 
        ADD COLUMN is_bot_active BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added is_bot_active column to conversations');
    }
    
    if (!existingColumns.includes('current_node_id')) {
      await connection.query(`
        ALTER TABLE conversations 
        ADD COLUMN current_node_id VARCHAR(36) NULL
      `);
      console.log('✅ Added current_node_id column to conversations');
    }
    
    if (!existingColumns.includes('bot_flow_id')) {
      await connection.query(`
        ALTER TABLE conversations 
        ADD COLUMN bot_flow_id VARCHAR(36) NULL
      `);
      console.log('✅ Added bot_flow_id column to conversations');
    }
    
    if (existingColumns.length === 3) {
      console.log('ℹ️ All conversation chatbot columns already exist');
    }
    
    console.log('🎉 Chatbot improvements migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateChatbotImprovements()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateChatbotImprovements;

