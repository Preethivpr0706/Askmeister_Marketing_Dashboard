const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'whatsapp_templates',
  charset: 'utf8mb4'
};

async function migrateFlows() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database for flows migration');

    // Create flows table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS flows (
        id VARCHAR(36) PRIMARY KEY,
        business_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(20) DEFAULT '1.0.0',
        category ENUM('marketing', 'utility', 'authentication', 'customer_support') DEFAULT 'utility',
        language VARCHAR(10) DEFAULT 'en_US',
        status ENUM('draft', 'pending', 'approved', 'rejected', 'published') DEFAULT 'draft',
        flow_data JSON NOT NULL,
        whatsapp_flow_id VARCHAR(255) NULL,
        whatsapp_status VARCHAR(50) NULL,
        rejection_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        INDEX idx_business_id (business_id),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Create flow_nodes table for individual flow components
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS flow_nodes (
        id VARCHAR(36) PRIMARY KEY,
        flow_id VARCHAR(36) NOT NULL,
        node_id VARCHAR(50) NOT NULL,
        type ENUM('screen', 'form', 'list_picker', 'confirmation', 'text', 'image', 'button', 'condition') NOT NULL,
        title VARCHAR(255),
        content TEXT,
        position_x INT DEFAULT 0,
        position_y INT DEFAULT 0,
        properties JSON,
        validation_rules JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        UNIQUE KEY unique_flow_node (flow_id, node_id),
        INDEX idx_flow_id (flow_id),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Create flow_edges table for connections between nodes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS flow_edges (
        id VARCHAR(36) PRIMARY KEY,
        flow_id VARCHAR(36) NOT NULL,
        source_node_id VARCHAR(50) NOT NULL,
        target_node_id VARCHAR(50) NOT NULL,
        edge_type ENUM('default', 'condition', 'button_click', 'form_submit') DEFAULT 'default',
        condition_value VARCHAR(255),
        button_text VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        INDEX idx_flow_id (flow_id),
        INDEX idx_source_target (source_node_id, target_node_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Create flow_versions table for version control
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS flow_versions (
        id VARCHAR(36) PRIMARY KEY,
        flow_id VARCHAR(36) NOT NULL,
        version_number VARCHAR(20) NOT NULL,
        flow_data JSON NOT NULL,
        change_log TEXT,
        is_current BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36) NOT NULL,
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        UNIQUE KEY unique_flow_version (flow_id, version_number),
        INDEX idx_flow_id (flow_id),
        INDEX idx_is_current (is_current)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Create flow_analytics table for tracking flow performance
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS flow_analytics (
        id VARCHAR(36) PRIMARY KEY,
        flow_id VARCHAR(36) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        current_node_id VARCHAR(50) NULL,
        completion_status ENUM('completed', 'abandoned', 'error') DEFAULT 'abandoned',
        error_message TEXT NULL,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        INDEX idx_flow_id (flow_id),
        INDEX idx_phone_number (phone_number),
        INDEX idx_session_id (session_id),
        INDEX idx_completion_status (completion_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Add flow_id column to campaigns table for flow-based campaigns
    try {
      await connection.execute(`
        ALTER TABLE campaigns 
        ADD COLUMN flow_id VARCHAR(36) NULL,
        ADD COLUMN flow_data JSON NULL,
        ADD INDEX idx_flow_id (flow_id)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
    }

    // Add flow_id column to chat_messages for flow interactions
    try {
      await connection.execute(`
        ALTER TABLE chat_messages 
        ADD COLUMN flow_id VARCHAR(36) NULL,
        ADD COLUMN flow_node_id VARCHAR(50) NULL,
        ADD COLUMN flow_session_id VARCHAR(255) NULL,
        ADD INDEX idx_flow_id (flow_id),
        ADD INDEX idx_flow_session (flow_session_id)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
    }

    console.log('✅ Flow tables created successfully');
    console.log('📊 Tables created:');
    console.log('   - flows (main flow definitions)');
    console.log('   - flow_nodes (individual flow components)');
    console.log('   - flow_edges (connections between nodes)');
    console.log('   - flow_versions (version control)');
    console.log('   - flow_analytics (performance tracking)');
    console.log('   - Updated campaigns and chat_messages tables');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFlows()
    .then(() => {
      console.log('🎉 Flow migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Flow migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateFlows };
