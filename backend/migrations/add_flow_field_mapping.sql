-- Migration to add flow field mapping table
-- This table stores the mapping between original component IDs and generated field names
-- so we can properly map flow responses back to meaningful field names

CREATE TABLE flow_field_mappings (
    id VARCHAR(36) PRIMARY KEY,
    flow_id VARCHAR(36) NOT NULL,
    component_id VARCHAR(255) NOT NULL,
    original_label TEXT,
    generated_field_name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_example TEXT,
    screen_id VARCHAR(255),
    component_position INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes for efficient lookups
    INDEX idx_flow_id (flow_id),
    INDEX idx_component_id (component_id),
    INDEX idx_generated_field_name (generated_field_name),
    INDEX idx_flow_component (flow_id, component_id),

    -- Foreign key constraint
    FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add field mapping data when creating/updating flows
-- This will be populated by the application when converting flows to WhatsApp format
