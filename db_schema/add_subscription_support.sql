-- Add subscription support to contacts table
-- This migration adds a subscribed column with default value TRUE

ALTER TABLE contacts 
ADD COLUMN subscribed BOOLEAN DEFAULT TRUE NOT NULL;

-- Add index for better query performance when filtering by subscription status
CREATE INDEX idx_contacts_subscribed ON contacts(subscribed);

-- Update existing contacts to be subscribed by default (if any exist)
UPDATE contacts SET subscribed = TRUE WHERE subscribed IS NULL;

