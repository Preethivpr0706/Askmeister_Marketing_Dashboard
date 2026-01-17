-- Migration: Add Custom Fields Support and Business-Scoped Contact Lists
-- Date: 2024
-- Description: 
-- 1. Add business_id to contact_lists (keep user_id for tracking)
-- 2. Add custom_fields JSON column to contacts
-- 3. Create contact_field_definitions table

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

-- ============================================
-- Step 4: Insert predefined field definitions
-- ============================================
-- Note: These will be inserted per business when needed, or can be inserted here
-- as system-wide defaults. For now, we'll handle this in the application code.

