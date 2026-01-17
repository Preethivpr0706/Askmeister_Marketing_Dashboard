-- Create users table
create database whatsapp_templates;
use whatsapp_templates;
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create templates table
CREATE TABLE templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category ENUM('marketing', 'utility', 'authentication') NOT NULL,
  language VARCHAR(10) NOT NULL,
  header_type ENUM('text', 'image', 'video') NOT NULL,
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text VARCHAR(255),
  status ENUM('draft', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  user_id VARCHAR(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create template_buttons table
CREATE TABLE template_buttons (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  type ENUM('url', 'phone_number', 'quick_reply') NOT NULL,
  text VARCHAR(255) NOT NULL,
  value TEXT,
  button_order INT NOT NULL CHECK (button_order >= 0 AND button_order < 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create campaigns table
CREATE TABLE campaigns (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  template_id VARCHAR(36) NOT NULL,
  status ENUM('draft', 'scheduled', 'sent', 'failed') NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  recipient_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  user_id VARCHAR(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add indexes for performance
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_template_buttons_template_id ON template_buttons(template_id);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_template_id ON campaigns(template_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);



INSERT INTO users (`id`, `email`, `name`) VALUES ('1', 'info@askmeister.com', 'Ashok');
ALTER TABLE templates ADD COLUMN variables TEXT DEFAULT NULL;

ALTER TABLE templates
ADD COLUMN whatsapp_id VARCHAR(255),
ADD COLUMN whatsapp_status VARCHAR(50),
ADD COLUMN quality_score FLOAT,
ADD COLUMN rejection_reason TEXT;

-- Create contact_lists table
CREATE TABLE contact_lists (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_list_name (name, user_id)
);

-- Create contacts table
CREATE TABLE contacts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  fname VARCHAR(100),
  lname VARCHAR(100),
  wanumber VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  list_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contact_in_list (wanumber, list_id)
);

alter table templates modify column header_type ENUM('text', 'image', 'video','none') NOT NULL;

ALTER TABLE campaigns 
MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft';

-- Business details table
CREATE TABLE businesses (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  profile_image_url VARCHAR(512),
  industry ENUM('technology', 'retail', 'healthcare', 'finance', 'other') DEFAULT 'technology',
  size ENUM('small', 'medium', 'large', 'enterprise') DEFAULT 'medium',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

alter table users add column  business_id VARCHAR(36);
INSERT INTO businesses (`id`, `name`, `contact_phone`) VALUES (1, 'Meister Solutions', '919094995418');


alter table campaigns add column failed_count INT NOT NULL DEFAULT 0 after delivered_count;


CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,
    contact_id VARCHAR(255) NOT NULL,
    status ENUM('queued', 'sent', 'delivered', 'read', 'failed') DEFAULT 'queued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
ALTER TABLE messages
ADD COLUMN error TEXT DEFAULT NULL,
ADD COLUMN whatsapp_status VARCHAR(50) DEFAULT NULL,
ADD COLUMN timestamp TIMESTAMP NULL;

CREATE TABLE message_status_history (
    id VARCHAR(50) PRIMARY KEY,
    message_id VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE campaigns ADD COLUMN contacts JSON;
ALTER TABLE campaigns ADD COLUMN field_mappings JSON;

alter table users add column password varchar(300) default null;




CREATE TABLE business_settings (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL,
    whatsapp_api_token TEXT NOT NULL,
    whatsapp_business_account_id VARCHAR(255) NOT NULL,
    whatsapp_phone_number_id VARCHAR(255) NOT NULL,
    facebook_app_id VARCHAR(255) NOT NULL,
    webhook_verify_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



INSERT INTO business_settings (`id`, `business_id`, `whatsapp_api_token`, `whatsapp_business_account_id`, `whatsapp_phone_number_id`, `facebook_app_id`, `webhook_verify_token`) VALUES ('1', '1', 'EAAHwxZB6KBfcBOzf6mb0e8S2Eum8K8QpNkNOoCRmOmWaMBznDmkgkm1p0nZCZBGve0B7gpeG7Xs9L1LAMrHKcyNdopXcQUGDnZArPGVV9dsodrFLA56WdAe6lSqmWHhLyzLIYSZCxho9OVZBY8zjbWCpPuiI3lodXxHTh8ZBpy4ZCNt3CEP5wEHSamGXmP2ZAxTQNSgZDZD', '1677607116492342', '549704921563564', '546216467891703', 'verify_token');

ALTER TABLE campaigns ADD COLUMN business_id INT NOT NULL;
ALTER TABLE messages ADD COLUMN business_id INT NOT NULL;
ALTER TABLE templates ADD COLUMN business_id INT NOT NULL;

SET SQL_SAFE_UPDATES = 0;
UPDATE campaigns SET `business_id` = '1';
UPDATE messages SET `business_id` = '1';
UPDATE templates SET `business_id` = '1';


-- Add a new table for tracking URLs
CREATE TABLE tracked_urls (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add a table to track clicks per campaign
CREATE TABLE url_clicks (
    id VARCHAR(36) PRIMARY KEY,
    tracked_url_id VARCHAR(36) NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Add index for better performance
CREATE INDEX idx_url_clicks ON url_clicks(tracked_url_id, campaign_id);

SET SQL_SAFE_UPDATES = 0;
UPDATE users SET `business_id` = '1', `password` = 'Meister@1' WHERE (`id` = '1');


ALTER TABLE users
ADD COLUMN phone VARCHAR(20);

alter table templates modify column header_type ENUM('text', 'image', 'video','none','document') NOT NULL;


-- Create clients table (for businesses using your platform)
CREATE TABLE clients (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_client_phone (business_id, phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create conversation table
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36),
    contact_id VARCHAR(36),
    business_id VARCHAR(36) NOT NULL,
    whatsapp_message_id VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL,
    status ENUM('active', 'closed', 'archived') DEFAULT 'active',
    last_message_at TIMESTAMP NULL,
    unread_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_business_phone (business_id, phone_number),
    INDEX idx_status_business (business_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create chat_messages table for chat history
CREATE TABLE chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    whatsapp_message_id VARCHAR(255),
    direction ENUM('inbound', 'outbound') NOT NULL,
    message_type ENUM('text', 'image', 'video', 'audio', 'document', 'location', 'template', 'other') NOT NULL,
    content TEXT,
    media_url VARCHAR(512),
    media_filename VARCHAR(255),
    status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
    timestamp TIMESTAMP NOT NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation (conversation_id),
    INDEX idx_whatsapp_id (whatsapp_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create quick_replies table
CREATE TABLE quick_replies (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL,
    shortcode VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_business_shortcode (business_id, shortcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create conversation_tags table
CREATE TABLE conversation_tags (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation_tag (conversation_id, tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


alter table contacts add column business_id int;



alter table chat_messages add column updated_at timestamp null;
INSERT INTO clients (`id`, `business_id`, `name`, `phone`, `email`) VALUES ('1', '1', 'Meister Solutions', '8248672578', 'info@askmeister.com');

CREATE TABLE `business_files` (
  `id` varchar(36) NOT NULL,
  `business_id` varchar(36) NOT NULL,
  `uploaded_by` varchar(36) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `storage_filename` varchar(255) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `file_size` int NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `whatsapp_media_id` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_business_id` (`business_id`),
  KEY `idx_uploaded_by` (`uploaded_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
alter table chat_messages add column whatsapp_media_id varchar(255);
alter table business_files modify column file_type varchar(255);


alter table chat_messages modify column status ENUM('sent', 'delivered', 'read', 'failed','sending') DEFAULT 'sending';


-- Add archived_at and closed_at columns if they don't exist
ALTER TABLE conversations 
ADD COLUMN archived_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN  closed_at TIMESTAMP NULL DEFAULT NULL;


-- Create auto_replies table for keyword-based auto-responses
CREATE TABLE auto_replies (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    response_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_business_keyword (business_id, keyword),
    INDEX idx_business_active (business_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add auto-reply tracking columns to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN is_auto_reply BOOLEAN DEFAULT FALSE,
ADD COLUMN auto_reply_id VARCHAR(36) DEFAULT NULL,
ADD INDEX idx_auto_reply (is_auto_reply, auto_reply_id);


-- ==============================
-- ✅ Create chatbot_flows table
-- ==============================

use whatsapp_templates; 

CREATE TABLE IF NOT EXISTS chatbot_flows (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==============================
-- ✅ Create chatbot_nodes table
-- ==============================
CREATE TABLE IF NOT EXISTS chatbot_nodes (
    id VARCHAR(36) PRIMARY KEY,
    flow_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    position_x INT NOT NULL,
    position_y INT NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================
-- ✅ Create chatbot_edges table
-- ==============================
CREATE TABLE IF NOT EXISTS chatbot_edges (
  id VARCHAR(36) PRIMARY KEY,
  flow_id VARCHAR(36) NOT NULL,
  source_node_id VARCHAR(36) NOT NULL,
  target_node_id VARCHAR(36) NOT NULL,
  `condition` TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==============================
-- ✅ Add chatbot-related columns to conversations table
-- ==============================
ALTER TABLE conversations 
ADD COLUMN is_bot_active BOOLEAN DEFAULT FALSE;

ALTER TABLE conversations 
ADD COLUMN current_node_id VARCHAR(36) NULL;

ALTER TABLE conversations 
ADD COLUMN bot_flow_id VARCHAR(36) NULL;

-- ==============================
-- ✅ Add chatbot columns to chat_messages
-- ==============================
ALTER TABLE chat_messages 
ADD COLUMN is_bot BOOLEAN DEFAULT FALSE;

ALTER TABLE chat_messages 
ADD COLUMN is_campaign BOOLEAN DEFAULT FALSE;

ALTER TABLE chat_messages 
ADD COLUMN campaign_id VARCHAR(255) NULL;

-- Use JSON type for better structure
ALTER TABLE chat_messages 
ADD COLUMN interactive_data TEXT DEFAULT NULL;

-- Optional: expand message_type size if needed
ALTER TABLE chat_messages 
MODIFY COLUMN message_type VARCHAR(100);

-- ==============================
-- ✅ Adjust chatbot_nodes type column if it already exists
-- ==============================
ALTER TABLE chatbot_nodes 
MODIFY COLUMN type VARCHAR(50);

-- Make sure you're using the correct database
USE whatsapp_templates;

-- ===============================================
-- ✅ Create flows table
-- ===============================================
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
    INDEX idx_business_id (business_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- ✅ Create flow_nodes table
-- ===============================================
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
    UNIQUE KEY unique_flow_node (flow_id, node_id),
    INDEX idx_flow_id (flow_id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- ✅ Create flow_edges table
-- ===============================================
CREATE TABLE IF NOT EXISTS flow_edges (
    id VARCHAR(36) PRIMARY KEY,
    flow_id VARCHAR(36) NOT NULL,
    source_node_id VARCHAR(50) NOT NULL,
    target_node_id VARCHAR(50) NOT NULL,
    edge_type ENUM('default', 'condition', 'button_click', 'form_submit') DEFAULT 'default',
    condition_value VARCHAR(255),
    button_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_flow_id (flow_id),
    INDEX idx_source_target (source_node_id, target_node_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- ✅ Create flow_versions table
-- ===============================================
CREATE TABLE IF NOT EXISTS flow_versions (
    id VARCHAR(36) PRIMARY KEY,
    flow_id VARCHAR(36) NOT NULL,
    version_number VARCHAR(20) NOT NULL,
    flow_data JSON NOT NULL,
    change_log TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36) NOT NULL,
    UNIQUE KEY unique_flow_version (flow_id, version_number),
    INDEX idx_flow_id (flow_id),
    INDEX idx_is_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- ✅ Create flow_analytics table
-- ===============================================
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
    INDEX idx_flow_id (flow_id),
    INDEX idx_phone_number (phone_number),
    INDEX idx_session_id (session_id),
    INDEX idx_completion_status (completion_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- ✅ Add flow columns to campaigns table
-- ===============================================
ALTER TABLE campaigns 
ADD COLUMN flow_id VARCHAR(36) NULL,
ADD COLUMN flow_data JSON NULL,
ADD INDEX idx_flow_id (flow_id);

-- ===============================================
-- ✅ Add flow tracking columns to chat_messages table
-- ===============================================
ALTER TABLE chat_messages 
ADD COLUMN flow_id VARCHAR(36) NULL,
ADD COLUMN flow_node_id VARCHAR(50) NULL,
ADD COLUMN flow_session_id VARCHAR(255) NULL,
ADD INDEX idx_flow_id (flow_id),
ADD INDEX idx_flow_session (flow_session_id);

-- ===============================================
-- ✅ Modify category column in flows (as per your request)
-- ===============================================
ALTER TABLE flows MODIFY COLUMN category VARCHAR(100);


-- ==============================
-- ✅ Add WhatsApp Flow support to conversations table
-- ==============================
ALTER TABLE conversations
ADD COLUMN whatsapp_flow_id VARCHAR(36) NULL,
ADD INDEX idx_whatsapp_flow (whatsapp_flow_id);


CREATE TABLE chat_messages_history (
                id VARCHAR(36) PRIMARY KEY,
                conversation_id VARCHAR(36) NOT NULL,
                whatsapp_message_id VARCHAR(255),
                direction ENUM('inbound', 'outbound') NOT NULL,
                message_type VARCHAR(100),
                content TEXT,
                media_url VARCHAR(512),
                media_filename VARCHAR(255),
                status ENUM('sent', 'delivered', 'read', 'failed', 'sending') DEFAULT 'sending',
                timestamp TIMESTAMP NOT NULL,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL,
                whatsapp_media_id VARCHAR(255),
                is_auto_reply BOOLEAN DEFAULT FALSE,
                auto_reply_id VARCHAR(36) DEFAULT NULL,
                is_bot BOOLEAN DEFAULT FALSE,
                is_campaign BOOLEAN DEFAULT FALSE,
                campaign_id VARCHAR(255) DEFAULT NULL,
                interactive_data TEXT,
                flow_id VARCHAR(36) DEFAULT NULL,
                flow_node_id VARCHAR(50) DEFAULT NULL,
                flow_session_id VARCHAR(255) DEFAULT NULL,
                file_size VARCHAR(255) DEFAULT NULL,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_conversation (conversation_id),
                INDEX idx_whatsapp_id (whatsapp_message_id),
                INDEX idx_archived_at (archived_at),
                INDEX idx_timestamp (timestamp),
                INDEX idx_is_auto_reply (is_auto_reply),
                INDEX idx_flow_id (flow_id),
                INDEX idx_flow_session_id (flow_session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE INDEX idx_history_conversation_timestamp ON chat_messages_history(conversation_id, timestamp);
            CREATE INDEX idx_history_business_timestamp ON chat_messages_history(archived_at);

ALTER TABLE users
ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user';



--------------------

-- Add subscription support to contacts table
-- This migration adds a subscribed column with default value TRUE

ALTER TABLE contacts 
ADD COLUMN subscribed BOOLEAN DEFAULT TRUE NOT NULL;

-- Add index for better query performance when filtering by subscription status
CREATE INDEX idx_contacts_subscribed ON contacts(subscribed);

-- Update existing contacts to be subscribed by default (if any exist)
UPDATE contacts SET subscribed = TRUE WHERE subscribed IS NULL;


-- ============================================
-- Step 1: Update contact_lists table
-- ============================================

-- Add business_id column
ALTER TABLE contact_lists 
ADD COLUMN business_id VARCHAR(36) NULL AFTER user_id;

-- Populate business_id from users table
UPDATE contact_lists cl
JOIN users u ON cl.user_id = u.id
SET cl.business_id = u.business_id
WHERE cl.business_id IS NULL;

-- Make business_id NOT NULL
ALTER TABLE contact_lists 
MODIFY COLUMN business_id VARCHAR(36) NOT NULL;

-- Add foreign key to businesses
ALTER TABLE contact_lists
ADD CONSTRAINT fk_contact_lists_business 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Drop old unique constraint (name, user_id)
ALTER TABLE contact_lists 
DROP INDEX unique_list_name;

-- Add new unique constraint (name, business_id)
ALTER TABLE contact_lists
ADD UNIQUE KEY unique_list_name_business (name, business_id);

-- Add index for performance
CREATE INDEX idx_contact_lists_business_id ON contact_lists(business_id);

-- ============================================
-- Step 2: Add custom_fields to contacts table
-- ============================================

ALTER TABLE contacts 
ADD COLUMN custom_fields JSON DEFAULT NULL AFTER email;

-- Add index for JSON queries (MySQL 5.7+)
-- CREATE INDEX idx_contacts_custom_fields ON contacts((CAST(custom_fields AS CHAR(255) ARRAY)));

-- ============================================
-- Step 3: Create contact_field_definitions table
-- ============================================

CREATE TABLE contact_field_definitions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  business_id VARCHAR(36) NOT NULL,
  list_id VARCHAR(36) NULL, -- NULL = business-wide, specific ID = list-specific
  field_name VARCHAR(100) NOT NULL,
  field_type ENUM('text', 'number', 'date', 'email', 'phone') DEFAULT 'text',
  is_predefined BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE,
  UNIQUE KEY unique_field_name (business_id, list_id, field_name),
  INDEX idx_business_id (business_id),
  INDEX idx_list_id (list_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
