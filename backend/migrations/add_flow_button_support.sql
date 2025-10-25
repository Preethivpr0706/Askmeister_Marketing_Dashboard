-- Migration script to add flow button support to template_buttons table
-- Run this script to update your database schema

USE whatsapp_templates;

-- Add new columns to template_buttons table for flow button support
ALTER TABLE template_buttons 
ADD COLUMN flow_id VARCHAR(36) DEFAULT NULL,
ADD COLUMN flow_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN whatsapp_flow_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN icon VARCHAR(50) DEFAULT NULL;

-- Update the type enum to include 'FLOW'
ALTER TABLE template_buttons 
MODIFY COLUMN type ENUM('url', 'phone_number', 'quick_reply', 'FLOW') NOT NULL;

-- Add index for flow_id for better performance
CREATE INDEX idx_template_buttons_flow_id ON template_buttons(flow_id);

-- Add flow_id column to templates table if it doesn't exist
ALTER TABLE templates 
ADD COLUMN flow_id VARCHAR(36) DEFAULT NULL;

-- Add index for flow_id in templates table
CREATE INDEX idx_templates_flow_id ON templates(flow_id);

-- Update header_type enum to include 'document' if not already present
ALTER TABLE templates 
MODIFY COLUMN header_type ENUM('text', 'image', 'video', 'none', 'document') NOT NULL;

-- Update status enum to include 'failed' status
ALTER TABLE templates 
MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'failed') NOT NULL DEFAULT 'pending';

-- Increase whatsapp_status column length to handle longer status values
ALTER TABLE templates 
MODIFY COLUMN whatsapp_status VARCHAR(100) DEFAULT NULL;

-- Verify the changes
DESCRIBE template_buttons;
DESCRIBE templates;
