-- Migration script to add role-based access control
-- Run this script to update your database schema

USE whatsapp_templates;

-- Add role column to users table
ALTER TABLE users
ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user';

-- Add index for role-based queries
CREATE INDEX idx_users_role ON users(role);

-- Ensure users table has proper primary key (if not already set)
ALTER TABLE users MODIFY id INT NOT NULL;
ALTER TABLE users ADD PRIMARY KEY (id);

-- Ensure businesses table has proper primary key (if not already set)
ALTER TABLE businesses MODIFY id INT NOT NULL;
ALTER TABLE businesses ADD PRIMARY KEY (id);

-- Update existing users to have 'user' role (except admin users)
-- Note: You should manually set admin users after running this migration
UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';

-- Verify the changes
DESCRIBE users;
DESCRIBE businesses;
