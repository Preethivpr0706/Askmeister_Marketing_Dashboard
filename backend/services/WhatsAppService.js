// services/whatsAppService.js
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();
const Template = require('../models/templateModel');
const WhatsappConfigService = require('../services/WhatsappConfigService');
const { pool } = require('../config/database');
const ConversationController = require('../controllers/conversationController');
const conversationService = require('../services/conversationService');
const chatbotController = require('../controllers/chatbotController');

class WhatsAppService {
    static async submitTemplate(template, businessConfig) {
        try {
            console.log('Template data received:', template);
            //console.log(businessConfig);
            // Validate API configuration
            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiToken = businessConfig.whatsapp_api_token;
            const businessId = businessConfig.whatsapp_business_account_id;
            //console.log(whatsappApiToken, whatsappApiUrl, businessId);

            if (!whatsappApiUrl || !whatsappApiToken || !businessId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            // Parse variables if stored as string
            const variableSamples = typeof template.variables === 'string' ?
                JSON.parse(template.variables) :
                (template.variables || {});
            console.log(variableSamples);

            // Convert named variables to numbered format for WhatsApp
            const { processedBody, variableMapping, orderedVariables } = this.convertVariablesForWhatsApp(
                template.bodyText,
                variableSamples
            );

            // Prepare components
            const components = [];

            if (template.headerType && template.headerContent) {
                let headerComponent = {
                    type: "HEADER",
                    format: template.headerType.toUpperCase()
                };

                switch (template.headerType) {
                    case 'text':
                        headerComponent.text = template.headerContent;
                        // Convert variables in header text if needed
                        if (template.headerContent.includes('{{')) {
                            headerComponent.text = this.replaceVariables(
                                template.headerContent,
                                variableMapping
                            );
                        }
                        break;
                    case 'image':
                        headerComponent.example = {
                            header_handle: [template.headerContent.split(':').pop()] // This should be the handle from the upload
                        };
                    case 'video':
                        // Use the media handle directly for image/video headers
                        headerComponent.example = {
                            header_handle: [template.headerContent] // This should be the handle from the upload
                        };
                        break;
                    case 'document':
                        headerComponent.example = {
                            header_handle: [template.headerContent] // This should be the handle from the upload
                        };

                }
                components.push(headerComponent);
            }

            // Body component with variable examples
            const bodyComponent = {
                type: "BODY",
                text: processedBody
            };

            // Only add examples if we have variables
            if (Object.keys(orderedVariables).length > 0) {
                // Create example array in correct order
                const exampleValues = Object.values(orderedVariables);

                bodyComponent.example = {
                    body_text: [exampleValues] // Must be an array of arrays
                };
            }

            components.push(bodyComponent);

            // Footer component
            if (template.footerText) {
                components.push({
                    type: "FOOTER",
                    text: template.footerText
                });
            }

            // Buttons component
            // Fixed buttons component section
            if (template.buttons && template.buttons.length > 0) {
                const buttonsComponent = {
                    type: "BUTTONS",
                    buttons: template.buttons.map(button => {
                            // Common button properties
                            const buttonConfig = {
                                text: button.text
                            };

                            // Set type-specific properties
                            switch (button.type) {
                                case 'phone_number':
                                    if (!button.text || !button.value) {
                                        throw new Error('Phone button must have both display text and phone number');
                                    }
                                    return {
                                        ...buttonConfig,
                                        type: 'PHONE_NUMBER',
                                        text: button.text,
                                        phone_number: button.value
                                    };

                                case 'url':
                                    if (!button.value) throw new Error('URL button must have a URL');
                                    const urlButton = {
                                        ...buttonConfig,
                                        type: 'URL',
                                        text: button.text,
                                        url: button.value
                                    };

                                    // Add example if URL contains variables
                                    // FIXED: Use array of strings, not nested arrays
                                    if (button.value.includes('{{')) {
                                        urlButton.example = ["ABC123XYZ"]; // Correct format
                                    }

                                    return urlButton;

                                case 'quick_reply':
                                    return {
                                        ...buttonConfig,
                                        type: 'QUICK_REPLY',
                                        text: button.text,
                                    };

                                case 'flow':
                                    if (!button.whatsapp_flow_id) {
                                        throw new Error('Flow button must have a whatsapp_flow_id');
                                    }
                                    return {
                                        ...buttonConfig,
                                        type: 'FLOW',
                                        text: button.text,
                                        flow_id: button.whatsapp_flow_id
                                    };

                                default:
                                    throw new Error(`Invalid button type: ${button.type}`);
                            }
                        })
                        // REMOVED: Component-level example that was causing the error
                };
                components.push(buttonsComponent);
            }

            // Prepare payload
            const payload = {
                name: template.name,
                language: template.language,
                category: template.category.toUpperCase(),
                components
            };

            console.log('Submitting to WhatsApp API:', payload);
            console.log(JSON.stringify(payload, null, 2));
            console.log(JSON.stringify(components, null, 2));

            const response = await axios.post(
                `${whatsappApiUrl}/${businessId}/message_templates`,
                payload, {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('WhatsApp API response:', response.data);
            return response.data;
        } catch (error) {
            console.error('WhatsApp API Error:', error.response && error.response.data || error.message);
            
            // Extract user-friendly error message from WhatsApp API response
            if (error.response && error.response.data && error.response.data.error) {
                const apiError = error.response.data.error;
                
                // Prefer error_user_msg if available (more user-friendly)
                if (apiError.error_user_msg) {
                    throw new Error(apiError.error_user_msg);
                }
                
                // Fall back to error_user_title if available
                if (apiError.error_user_title) {
                    throw new Error(apiError.error_user_title);
                }
                
                // Fall back to message
                if (apiError.message) {
                    throw new Error(apiError.message);
                }
            }
            
            throw new Error('WhatsApp API request failed. Please try again.');
        }
    }

    // Enhanced method to convert named variables to numbered format
    static convertVariablesForWhatsApp(bodyText, variableSamples = {}) {
        try {
            // Extract all variable names from body text using regex
            const variableRegex = /\{\{([^}]+)\}\}/g;
            let match;
            const allVariables = [];

            // Find all variables
            while ((match = variableRegex.exec(bodyText)) !== null) {
                allVariables.push(match[1]);
            }

            const uniqueVars = [...new Set(allVariables)];

            // Create a mapping of variables to numbered positions
            const variableMapping = {};
            let nextNumber = 1;

            // First process existing numeric variables to maintain their numbers
            uniqueVars.forEach(varName => {
                if (!isNaN(varName)) {
                    const num = parseInt(varName);
                    nextNumber = Math.max(nextNumber, num + 1);
                    variableMapping[varName] = varName; // Keep numeric variables as is
                }
            });

            // Then assign numbers to named variables
            uniqueVars.forEach(varName => {
                if (isNaN(varName) && !variableMapping[varName]) {
                    variableMapping[varName] = nextNumber.toString();
                    nextNumber++;
                }
            });
            console.log(bodyText);
            // Replace all variables with numbered ones
            const processedBody = bodyText.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
                return `{{${variableMapping[varName]}}}`;
            });

            // Create ordered variables object with values mapped to their correct positions
            const orderedVariables = {};

            for (let i = 1; i < nextNumber; i++) {
                // Find the variable name that maps to this number
                const varName = Object.keys(variableMapping).find(key =>
                    variableMapping[key] === i.toString()
                );

                // Get the sample value for this variable
                if (varName) {
                    orderedVariables[i] = variableSamples[varName] || '';
                }
            }

            console.log('Variable mapping:', variableMapping);
            console.log('Original variables:', variableSamples);
            console.log('Ordered variables:', orderedVariables);

            return {
                processedBody,
                variableMapping,
                orderedVariables
            };
        } catch (error) {
            console.error('Error converting variables:', error);
            throw new Error('Failed to process template variables');
        }
    }

    // Helper method to replace variables in any text
    static replaceVariables(text, variableMapping = {}) {
        if (!text || typeof text !== 'string') return text;

        return text.replace(/{{(\w+)}}/g, (match, varName) => {
            return variableMapping[varName] ? `{{${variableMapping[varName]}}}` : match;
        });
    }


    static async checkAndUpdateTemplateStatus(template, userId) {
        try {
            const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

            if (!businessConfig) {
                throw new Error('Business configuration not found');
            }

            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiToken = businessConfig.whatsapp_api_token;
            const businessId = businessConfig.whatsapp_business_account_id;
            if (!whatsappApiUrl || !whatsappApiToken || !businessId) {
                throw new Error('WhatsApp API configuration is missing');
            }
            console.log(template)
                // Check template status in WhatsApp
            const response = await axios.get(
                `${whatsappApiUrl}/${businessId}/message_templates?name=${template.name}`, {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(response)
            if (response.data.data && response.data.data.length > 0) {
                const whatsappTemplate = response.data.data[0];
                console.log(whatsappTemplate);
                const status = whatsappTemplate.status.toLowerCase();

                // Map WhatsApp status to our status
                let templateStatus;
                switch (status) {
                    case 'approved':
                        templateStatus = 'approved';
                        break;
                    case 'rejected':
                        templateStatus = 'rejected';
                        break;
                    case 'pending':
                        templateStatus = 'pending';
                        break;
                    case 'disabled':
                        templateStatus = 'rejected';
                        break;
                    default:
                        templateStatus = 'pending';
                }
                console.log(templateStatus);
                console.log(whatsappTemplate.status);
                console.log(whatsappTemplate.rejection_reason);
                console.log(whatsappTemplate.quality_score);
                return {
                    status: templateStatus,
                    whatsappStatus: whatsappTemplate.status ? whatsappTemplate.status : null,
                    qualityScore: whatsappTemplate.quality_score ? whatsappTemplate.quality_score : null,
                    rejectionReason: whatsappTemplate.rejection_reason ? whatsappTemplate.rejection_reason : null
                };
            }

            // Template not found in WhatsApp (may have been deleted)
            // Return current status to avoid overwriting with 'pending'
            throw new Error('Template not found in WhatsApp. It may have been deleted.');
        } catch (error) {
            console.error('WhatsApp API Error:', error.response ? error.response.data : error.message);
            throw new Error('Failed to check template status');
        }
    }

    // Check if template name exists in WhatsApp Meta
    static async checkTemplateNameExists(templateName, userId) {
        try {
            const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

            if (!businessConfig) {
                throw new Error('Business configuration not found');
            }

            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiToken = businessConfig.whatsapp_api_token;
            const businessId = businessConfig.whatsapp_business_account_id;
            
            if (!whatsappApiUrl || !whatsappApiToken || !businessId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            // Check if template name exists in WhatsApp
            const response = await axios.get(
                `${whatsappApiUrl}/${businessId}/message_templates?name=${templateName}`, {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // If we get data back, the template name exists
            return response.data.data && response.data.data.length > 0;
        } catch (error) {
            console.error('WhatsApp API Error checking template name:', error.response ? error.response.data : error.message);
            // If there's an error, we'll assume the name doesn't exist to avoid blocking valid submissions
            return false;
        }
    }
    static async deleteTemplate(whatsappId, templateName, userId) {
            try {

                const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

                if (!businessConfig) {
                    throw new Error('Business configuration not found');
                }

                const whatsappApiUrl = process.env.WHATSAPP_API_URL;
                const whatsappApiToken = businessConfig.whatsapp_api_token;
                const businessId = businessConfig.whatsapp_business_account_id;
                if (!whatsappApiUrl || !whatsappApiToken || !businessId) {
                    throw new Error('WhatsApp API configuration is missing');
                }

                const response = await axios.delete(
                    `${whatsappApiUrl}/${businessId}/message_templates`, {
                        params: {
                            hsm_id: whatsappId,
                            name: templateName
                        },
                        headers: {
                            'Authorization': `Bearer ${whatsappApiToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                return response.data;
            } catch (error) {
                console.error('WhatsApp API Error:', error.response ? error.response.data : error);
                throw new Error(
                    error.response && error.response.data && error.response.data.error ? error.response.data.error.message :
                    error.message ||
                    'Failed to delete template from WhatsApp');
            }
        }
        // Create a media upload session
        // In WhatsAppService.js
    static async createMediaUploadSession(fileType, fileSize, userId) {
        try {
            const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

            if (!businessConfig) {
                throw new Error('Business configuration not found');
            }
            const whatsappApiToken = businessConfig.whatsapp_api_token;
            const appId = businessConfig.facebook_app_id;

            console.log('Creating media upload session with:', { fileType, appId });

            if (!whatsappApiToken || !appId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            // Call the Facebook Graph API to create a session
            const response = await axios.post(
                `https://graph.facebook.com/v19.0/${appId}/uploads`, {
                    upload_phase: 'start',
                    file_length: fileSize,
                    file_type: fileType,
                    access_type: 'TEMPLATE'
                }, {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('WhatsApp API response:', response.data);

            if (!response.data || !response.data.id) {
                throw new Error('Invalid response from WhatsApp API');
            }

            return response.data;
        } catch (error) {
            console.error('WhatsApp API Error:', error.response ? error.response.data : error);
            throw new Error(
                error.response && error.response.data && error.response.data.error ? error.response.data.error.message :
                error.message ||
                'Failed to create upload session'
            );
        }
    }


    // Upload file to the created session
    static async uploadFileToSession(sessionId, file, userId) {
            try {
                const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

                if (!businessConfig) {
                    throw new Error('Business configuration not found');
                }
                const whatsappApiToken = businessConfig.whatsapp_api_token;
                if (!whatsappApiToken) throw new Error('Missing WhatsApp API token');

                // Extract base session ID and signature
                const [baseSessionId, signature] = sessionId.split('?sig=');
                const uploadUrl = `https://graph.facebook.com/v19.0/${baseSessionId}${signature ? `?sig=${signature}` : ''}`;
    
            // Create form data with proper file metadata
            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
                knownLength: file.size
            });
            formData.append('upload_phase', 'transfer');
    
            // Get exact content length
            const contentLength = await new Promise(resolve => {
                formData.getLength((err, length) => {
                    resolve(err ? null : length);
                });
            });
    
            if (!contentLength) throw new Error('Could not calculate content length');
    
            // Upload the file chunks
            const uploadResponse = await axios.post(uploadUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${whatsappApiToken}`,
                    'Content-Length': contentLength
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                onUploadProgress: progressEvent => {
                    if (progressEvent.lengthComputable) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log(`Upload progress: ${percent}%`);
                    }
                }
            });
    
            // Finalize the upload
            const finishResponse = await axios.post(uploadUrl, {
                upload_phase: 'finish',
                file_length: file.size
            }, {
                headers: {
                    'Authorization': `Bearer ${whatsappApiToken}`,
                    'Content-Type': 'application/json'
                }
            });
    
            // Extract handle from response (check multiple possible locations)
            const handle = finishResponse.data?.h || 
            finishResponse.data?.id?.split(':').pop(); // Extract last part
    
            if (!handle) {
                console.error('Upload finished but no handle received:', finishResponse.data);
                throw new Error('Upload completed but no media handle received');
            }
            
    
            return { success: true, h: handle };
    
        } catch (error) {
            console.error('Upload failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'File upload failed');
        }
    }

     // Update existing template on WhatsApp
   
// Fixed updateTemplate method in WhatsAppService.js
static async updateTemplate(whatsappId, template, originalTemplate, userId) {
    try {
        // Check if name, category, or language were modified
        if (
            template.name !== originalTemplate.name ||
            template.category !== originalTemplate.category ||
            template.language !== originalTemplate.language
        ) {
            throw new Error("Cannot update template: Name, category, or language cannot be changed after WhatsApp submission.");
        }
         const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

            if (!businessConfig) {
                throw new Error('Business configuration not found');
            }
        const whatsappApiToken = businessConfig.whatsapp_api_token;

        if (!whatsappApiToken || !whatsappId) {
            throw new Error('WhatsApp API configuration is missing or template ID is invalid');
        }

        // Safely handle body text
        const bodyText = template.bodyText || template.body_text || '';

        // Handle variables - ensure it's always an object
        let variables = {};
        try {
            variables = typeof template.variables === 'string' ?
                JSON.parse(template.variables) :
                (template.variables || {});
        } catch (e) {
            console.error('Error parsing variables:', e);
        }

        // Convert variables if body text exists
        let processedBody = bodyText;
        let orderedVariables = {};

        if (bodyText) {
            const conversionResult = this.convertVariablesForWhatsApp(bodyText, variables);
            processedBody = conversionResult.processedBody;
            orderedVariables = conversionResult.orderedVariables;
        }

        // Prepare components
        const components = [];

        // Header component
        if (template.headerType && template.headerContent) {
            const headerType = template.headerType.toLowerCase();
            const headerComponent = {
                type: "HEADER",
                format: headerType.toUpperCase()
            };

            if (headerType === 'text') {
                headerComponent.text = template.headerContent;

                // Add example for header text variables if needed
                if (template.headerContent.includes('{{')) {
                    // Extract variable names and match them with samples
                    const headerVarRegex = /\{\{([^}]+)\}\}/g;
                    let match;
                    const headerVars = [];
                    while ((match = headerVarRegex.exec(template.headerContent)) !== null) {
                        headerVars.push(match[1]);
                    }

                    if (headerVars.length > 0) {
                        headerComponent.example = {
                            header_text: [variables[headerVars[0]] || "Example"]
                        };
                    }
                }
            } else {
                headerComponent.example = {
                    header_handle: [template.headerContent]
                };
            }
            components.push(headerComponent);
        }

        // Body component - FIXED: Always include example if there are variables
        if (bodyText) {
            const bodyComponent = {
                type: "BODY",
                text: processedBody
            };

            // CRITICAL FIX: Always add example when variables exist, even if empty
            if (Object.keys(orderedVariables).length > 0) {
                // Ensure we have non-empty example values
                const exampleValues = Object.values(orderedVariables).map(value => 
                    value && value.trim() !== '' ? value : 'Sample'
                );
                
                bodyComponent.example = {
                    body_text: [exampleValues] // Must be array of arrays
                };
            }
            
            components.push(bodyComponent);
        }

        // Footer component
        if (template.footerText) {
            components.push({
                type: "FOOTER",
                text: template.footerText
            });
        }

        // Buttons component
        // Fixed buttons component section
            if (template.buttons && template.buttons.length > 0) {
                const buttonsComponent = {
                    type: "BUTTONS",
                    buttons: template.buttons.map(button => {
                            // Common button properties
                            const buttonConfig = {
                                text: button.text
                            };

                            // Set type-specific properties
                            switch (button.type) {
                                case 'phone_number':
                                    if (!button.text || !button.value) {
                                        throw new Error('Phone button must have both display text and phone number');
                                    }
                                    return {
                                        ...buttonConfig,
                                        type: 'PHONE_NUMBER',
                                        text: button.text,
                                        phone_number: button.value
                                    };

                                case 'url':
                                    if (!button.value) throw new Error('URL button must have a URL');
                                    const urlButton = {
                                        ...buttonConfig,
                                        type: 'URL',
                                        text: button.text,
                                        url: button.value
                                    };

                                    // Add example if URL contains variables
                                    // FIXED: Use array of strings, not nested arrays
                                    if (button.value.includes('{{')) {
                                        urlButton.example = ["ABC123XYZ"]; // Correct format
                                    }

                                    return urlButton;

                                case 'quick_reply':
                                    return {
                                        ...buttonConfig,
                                        type: 'QUICK_REPLY',
                                        text: button.text,
                                    };

                                case 'flow':
                                    if (!button.whatsapp_flow_id) {
                                        throw new Error('Flow button must have a whatsapp_flow_id');
                                    }
                                    return {
                                        ...buttonConfig,
                                        type: 'FLOW',
                                        text: button.text,
                                        flow_id: button.whatsapp_flow_id
                                    };

                                default:
                                    throw new Error(`Invalid button type: ${button.type}`);
                            }
                        })
                        // REMOVED: Component-level example that was causing the error
                };
                components.push(buttonsComponent);
            }

        // Prepare payload - note that we're not including name and language for updates
        const payload = {
            components
        };

        // For rejected templates, we might need to update the category
        if (template.status === 'rejected') {
            payload.category = template.category.toUpperCase();
        }

        console.log(`Updating WhatsApp template ID ${whatsappId} with payload:`, JSON.stringify(payload, null, 2));

        // Use the direct template ID endpoint for updates
        const response = await axios.post(
            `https://graph.facebook.com/v19.0/${whatsappId}`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${whatsappApiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('WhatsApp template update response:', response.data);
        return response.data;
    } catch (error) {
        console.error('WhatsApp API Error:', error.response?.data || error.message);
        
        // Extract user-friendly error message from WhatsApp API response
        if (error.response?.data?.error) {
            const apiError = error.response.data.error;
            
            // Prefer error_user_msg if available (more user-friendly)
            if (apiError.error_user_msg) {
                throw new Error(apiError.error_user_msg);
            }
            
            // Fall back to error_user_title if available
            if (apiError.error_user_title) {
                throw new Error(apiError.error_user_title);
            }
            
            // Fall back to message
            if (apiError.message) {
                throw new Error(apiError.message);
            }
        }
        
        throw new Error('WhatsApp template update failed. Please try again.');
    }
}

// Also need to fix the convertVariablesForWhatsApp method to handle empty variables better
    static convertVariablesForWhatsApp(bodyText, variableSamples = {}) {
        try {
            // Extract all variable names from body text using regex
            const variableRegex = /\{\{([^}]+)\}\}/g;
            let match;
            const allVariables = [];

            // Find all variables
            while ((match = variableRegex.exec(bodyText)) !== null) {
                allVariables.push(match[1]);
            }

            const uniqueVars = [...new Set(allVariables)];

            // Create a mapping of variables to numbered positions
            const variableMapping = {};
            let nextNumber = 1;

            // First process existing numeric variables to maintain their numbers
            uniqueVars.forEach(varName => {
                if (!isNaN(varName)) {
                    const num = parseInt(varName);
                    nextNumber = Math.max(nextNumber, num + 1);
                    variableMapping[varName] = varName; // Keep numeric variables as is
                }
            });

            // Then assign numbers to named variables
            uniqueVars.forEach(varName => {
                if (isNaN(varName) && !variableMapping[varName]) {
                    variableMapping[varName] = nextNumber.toString();
                    nextNumber++;
                }
            });

            console.log(bodyText);
            // Replace all variables with numbered ones
            const processedBody = bodyText.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
                return `{{${variableMapping[varName]}}}`;
            });

            // Create ordered variables object with values mapped to their correct positions
            const orderedVariables = {};

            for (let i = 1; i < nextNumber; i++) {
                // Find the variable name that maps to this number
                const varName = Object.keys(variableMapping).find(key =>
                    variableMapping[key] === i.toString()
                );

                // Get the sample value for this variable - provide default if empty
                if (varName) {
                    const sampleValue = variableSamples[varName];
                    // FIXED: Provide meaningful default values instead of empty strings
                    orderedVariables[i] = sampleValue && sampleValue.trim() !== '' ?
                        sampleValue :
                        `Sample${i}`; // Provide a default sample value
                }
            }

            console.log('Variable mapping:', variableMapping);
            console.log('Original variables:', variableSamples);
            console.log('Ordered variables:', orderedVariables);

            return {
                processedBody,
                variableMapping,
                orderedVariables
            };
        } catch (error) {
            console.error('Error converting variables:', error);
            throw new Error('Failed to process template variables');
        }
    }

 // Fixed method for sending template messages with proper image handling
    static async sendTemplateMessage(messageData, userId, campaignId, templateId) {
        try {
            // Get business-specific configuration
           const config = await WhatsappConfigService.getConfigForUser(userId);
            if (!config) {
                throw new Error('WhatsApp configuration not found');
            }
            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiToken = config.whatsapp_api_token;
            const phoneNumberId = config.whatsapp_phone_number_id;

            if (!whatsappApiUrl || !whatsappApiToken || !phoneNumberId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            // Prepare the base payload
            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: messageData.to,
                type: "template",
                template: {
                    name: messageData.template,
                    language: {
                        code: messageData.language?.code || 'en_US',
                        policy: "deterministic"
                    },
                    components: []
                }
            };

            // Handle header component with proper media handling for iOS
       /*     if (messageData.header) {
                const headerComponent = {
                    type: "header",
                    parameters: []
                };

                if (messageData.header.type === 'text') {
                    headerComponent.parameters.push({
                        type: "text",
                        text: messageData.header.content
                    });
                } else if (messageData.header.type === 'image') {
                    // Critical fix for iOS compatibility
                    if (!messageData.header.mediaId) {
                        throw new Error('Media ID is required for image headers');
                    }

                    // Ensure proper image parameter structure for iOS
                    headerComponent.parameters.push({
                        type: "image",
                        image: {
                            id: messageData.header.mediaId
                        }
                    });
                } else if (messageData.header.type === 'video') {
                    headerComponent.parameters.push({
                        type: "video",
                        video: {
                            id: messageData.header.mediaId
                        }
                    });
                } else if (messageData.header.type === 'document') {
                    headerComponent.parameters.push({
                        type: "document",
                        document: {
                            id: messageData.header.mediaId,
                            filename: messageData.header.filename || "document"
                        }
                    });
                }

                payload.template.components.push(headerComponent);
            }*/
           // Handle header component with proper media handling for iOS
if (messageData.header) {
    // Only add header component if it's not a simple text header
    // or if it contains variables (indicated by {{)
    if (messageData.header.type !== 'text' || messageData.header.content.includes('{{')) {
        const headerComponent = {
            type: "header",
            parameters: []
        };

        if (messageData.header.type === 'text') {
            // Only add parameters for text headers with variables
            if (messageData.header.content.includes('{{')) {
                headerComponent.parameters.push({
                    type: "text",
                    text: messageData.header.content
                });
            }
        } else if (messageData.header.type === 'image') {
            // Critical fix for iOS compatibility
            if (!messageData.header.mediaId) {
                throw new Error('Media ID is required for image headers');
            }

            headerComponent.parameters.push({
                type: "image",
                image: {
                    id: messageData.header.mediaId
                }
            });
        } else if (messageData.header.type === 'video') {
            headerComponent.parameters.push({
                type: "video",
                video: {
                    id: messageData.header.mediaId
                }
            });
        } else if (messageData.header.type === 'document') {
            headerComponent.parameters.push({
                type: "document",
                document: {
                    id: messageData.header.mediaId,
                   filename: messageData.header.filename || "document"
                }
            });
        }

        // Only add the header component if we have parameters
        if (headerComponent.parameters.length > 0) {
            payload.template.components.push(headerComponent);
        }
    }
}


            // Handle body components
            if (messageData.bodyParameters && messageData.bodyParameters.length > 0) {
                payload.template.components.push({
                    type: "body",
                    parameters: messageData.bodyParameters.map(param => ({
                        type: "text",
                        text: param
                    }))
                });
            }
//           // Handle button components
// if (messageData.buttons) {
//     const buttonComponent = {
//         type: "button",
//         sub_type: "url",
//         index: "0",  // Since we're dealing with URL parameter
//         parameters: [
//             {
//                 type: "text",
//                 text: campaignId || '0'
//             }
//         ]
//     };

//     payload.template.components.push(buttonComponent);
// }

// Then in sendTemplateMessage, at the beginning, add:
let templateButtons = [];
if (templateId) {
    [templateButtons] = await pool.execute(`
        SELECT type, button_order, flow_id, flow_name, whatsapp_flow_id
        FROM template_buttons 
        WHERE template_id = ?
        ORDER BY button_order ASC
    `, [templateId]);
}

// Then modify the button handling section:
if (templateButtons && templateButtons.length > 0) {
    console.log('🔘 Template has buttons:', templateButtons.map(btn => ({ type: btn.type, flow_id: btn.flow_id })));

    // Process each button
    for (const button of templateButtons) {
        if(button.type==='url' || button.type==='FLOW' ){
        const buttonComponent = {
            type: "button",
            sub_type: button.type,  // 'url' or 'FLOW'
            index: button.button_order.toString(),
            parameters: []
        };

        if (button.type === 'url') {
            buttonComponent.parameters.push({
                type: "text",
                text: campaignId || '0'
            });
        } else if (button.type === 'FLOW') {
            buttonComponent.parameters.push({
                type: "action",
                action: {
                    flow_token: button.whatsapp_flow_id || `FLOW_${campaignId}_${button.flow_id || Date.now()}`,
                }
            });
        }

        payload.template.components.push(buttonComponent);
    }
    }
}
            console.log('Final WhatsApp message payload:', JSON.stringify(payload, null, 2));

            const response = await axios.post(
                `${whatsappApiUrl}/${phoneNumberId}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("Response:", JSON.stringify(response.data, null, 2));

            // Return flow_id if template has FLOW buttons
            let detectedFlowId = null;
            if (templateButtons && templateButtons.length > 0) {
                const flowButton = templateButtons.find(btn => btn.type === 'FLOW');
                if (flowButton) {
                    detectedFlowId = flowButton.flow_id;
                    console.log('🎯 Detected WhatsApp Flow ID:', detectedFlowId);
                } else {
                    console.log('❌ No FLOW buttons found in template');
                }
            } else {
                console.log('❌ No buttons found in template');
            }

            return {
                success: true,
                messageId: response.data?.messages?.[0]?.id,
                status: 'sent',
                timestamp: new Date().toISOString(),
                recipientId: messageData.to,
                rawResponse: response.data,
                flowId: detectedFlowId // Include flow_id in response
            };
        } catch (error) {
            console.error('WhatsApp API Error:', error.response?.data || error.message);
            throw new Error(
                error.response?.data?.error?.message || 
                'Failed to send template message'
            );
        }
    }

    // Enhanced media upload method with iOS compatibility
    static async uploadMediaToWhatsApp(userId, fileBuffer, fileType, filename = null) {
        try {
const businessConfig = await WhatsappConfigService.getConfigForUser(userId);

            if (!businessConfig) {
                throw new Error('Business configuration not found');
            }
            
            const whatsappApiUrl = process.env.WHATSAPP_API_URL;
            const whatsappApiToken = businessConfig.whatsapp_api_token;
            const phoneNumberId = businessConfig.whatsapp_phone_number_id;

            if (!whatsappApiUrl || !whatsappApiToken || !phoneNumberId) {
                throw new Error('WhatsApp API configuration is missing');
            }

            // Validate file type and size for iOS compatibility
            const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            const allowedVideoTypes = ['video/mp4', 'video/3gpp'];
            const maxImageSize = 5 * 1024 * 1024; // 5MB
            const maxVideoSize = 16 * 1024 * 1024; // 16MB

            if (fileType.startsWith('image/')) {
                if (!allowedImageTypes.includes(fileType.toLowerCase())) {
                    throw new Error('Unsupported image format. Use JPEG or PNG for iOS compatibility.');
                }
                if (fileBuffer.length > maxImageSize) {
                    throw new Error('Image size exceeds 5MB limit');
                }
            } else if (fileType.startsWith('video/')) {
                if (!allowedVideoTypes.includes(fileType.toLowerCase())) {
                    throw new Error('Unsupported video format. Use MP4 or 3GPP for iOS compatibility.');
                }
                if (fileBuffer.length > maxVideoSize) {
                    throw new Error('Video size exceeds 16MB limit');
                }
            }

            const formData = new FormData();
            
            // Use proper filename with extension for iOS compatibility
            const fileExtension = fileType.split('/')[1];
            const actualFilename = filename || `media_${Date.now()}.${fileExtension}`;
            
            formData.append('file', fileBuffer, {
                filename: actualFilename,
                contentType: fileType
            });
            formData.append('type', fileType.split('/')[0]); // 'image' or 'video'
            formData.append('messaging_product', 'whatsapp');

            const response = await axios.post(
                `${whatsappApiUrl}/${phoneNumberId}/media`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${whatsappApiToken}`
                    },
                    timeout: 30000 // 30 second timeout
                }
            );

            console.log('Media upload response:', response.data);

            if (!response.data.id) {
                throw new Error('No media ID returned from WhatsApp API');
            }

            return response.data.id;
        } catch (error) {
            console.error('WhatsApp Media Upload Error:', error.response?.data || error.message);
            throw new Error(
                error.response?.data?.error?.message || 
                'Failed to upload media to WhatsApp'
            );
        }
    }

    // Method to validate media before upload
    static validateMediaForTemplate(file, headerType) {
  const validations = {
    image: {
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
      maxSize: 5 * 1024 * 1024,
    },
    video: {
      allowedTypes: ['video/mp4', 'video/3gpp'],
      maxSize: 16 * 1024 * 1024,
    },
    document: {
      allowedTypes: [
        'application/pdf', 
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      maxSize: 100 * 1024 * 1024,
    }
  };


        const validation = validations[headerType];
        if (!validation) {
            throw new Error(`Unsupported header type: ${headerType}`);
        }

        if (!validation.allowedTypes.includes(file.mimetype.toLowerCase())) {
            throw new Error(`Invalid file type. Allowed types: ${validation.allowedTypes.join(', ')}`);
        }

        if (file.size > validation.maxSize) {
            throw new Error(`File size exceeds ${validation.maxSize / (1024 * 1024)}MB limit`);
        }

        return true;
    }

    // Method to download media from WhatsApp
    static async downloadMedia(mediaId, businessId) {
        try {
            const businessConfig = await WhatsappConfigService.getConfigForBusiness(businessId);

            if (!businessConfig) {
                throw new Error('Business configuration not found');
            }

            const whatsappApiToken = businessConfig.whatsapp_api_token;

            if (!whatsappApiToken) {
                throw new Error('WhatsApp API token not found');
            }

            // WhatsApp media download requires two steps:
            // 1. Get the media URL from the media ID
            // 2. Download the actual file from that URL
            const whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0';
            
            console.log(`Fetching media URL for mediaId: ${mediaId}`);
            const mediaInfoResponse = await axios.get(
                `${whatsappApiUrl}/${mediaId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`
                    }
                }
            );

            const mediaUrl = mediaInfoResponse.data.url;
            if (!mediaUrl) {
                throw new Error('Media URL not found in response');
            }

            console.log(`Downloading media from URL: ${mediaUrl}`);
            // Download the actual media file
            const response = await axios.get(
                mediaUrl,
                {
                    headers: {
                        'Authorization': `Bearer ${whatsappApiToken}`
                    },
                    responseType: 'arraybuffer' // Important for binary data
                }
            );

            // Upload to our server and return the URL
            const MediaUploadController = require('../controllers/MediaUploadController');
            const buffer = Buffer.from(response.data);
            const filename = `media_${Date.now()}_${mediaId}`;
            const mimeType = response.headers['content-type'] || 'application/octet-stream';

            // Create a mock file object for upload
            const mockFile = {
                buffer: buffer,
                originalname: filename,
                mimetype: mimeType,
                size: buffer.length
            };

            const uploadResult = await MediaUploadController.uploadMedia(mockFile, businessId);

            return {
                url: uploadResult.url,
                filename: filename,
                mimeType: mimeType,
                size: buffer.length
            };
        } catch (error) {
            console.error('Error downloading media:', error.response?.data || error.message);
            throw new Error('Failed to download media');
        }
    }
  static async sendMessage({ to, businessId, messageType, content }) {
    try {
      // Get business settings
      const [settings] = await pool.query(
        `SELECT * FROM business_settings 
        WHERE business_id = ?`,
        [businessId]
      );

      if (!settings.length) {
        throw new Error('Business settings not found');
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${settings[0].whatsapp_api_token}`,
          'Content-Type': 'application/json'
        }
      };

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          body: content
        }
      };

      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${settings[0].whatsapp_phone_number_id}/messages`,
        payload,
        config
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error) {
      console.error('WhatsApp API error:', error.response?.data || error.message);
      throw error;
    }
  }

    static async processIncomingMessage(entry, wss) {
        try {
            for (const item of entry) {
                let phoneNumberId;

                if (
                    item &&
                    item.changes &&
                    item.changes[0] &&
                    item.changes[0].value &&
                    item.changes[0].value.metadata &&
                    item.changes[0].value.metadata.phone_number_id
                ) {
                    phoneNumberId = item.changes[0].value.metadata.phone_number_id;
                }

                if (!phoneNumberId) continue;

                // Get business settings
                const [settings] = await pool.query(
                    'SELECT business_id FROM business_settings WHERE whatsapp_phone_number_id = ?', [phoneNumberId]
                );

                if (!settings.length) continue;
                const businessId = settings[0].business_id;

                for (const change of item.changes) {
                    
                    if (change.value.messages) {
                        for (const message of change.value.messages) {
                            let content = '';

                            // Extract contact information from webhook payload
                            let contactName = null;
                            if (change.value.contacts && change.value.contacts.length > 0) {
                                const contact = change.value.contacts[0];
                                if (contact.profile && contact.profile.name) {
                                    contactName = contact.profile.name;
                                }
                            }
                            console.log('Extracted contact name from webhook:', contactName, 'for phone:', message.from);

                            // Handle different message types for incoming messages
                            let interactiveData = null;
                            let mediaUrl = null;
                            let mediaFilename = null;
                            let fileSize = null;

                            switch (message.type) {
                                case 'text':
                                    content = message.text.body;
                                    console.log('Incoming text message content:', content);
                                    break;
                                case 'interactive':
                                    // Handle interactive messages (buttons, lists, flow replies)
                                    if (message.interactive.type === 'button_reply') {
                                        content = message.interactive.button_reply.title;
                                        interactiveData = {
                                            type: 'button',
                                            button_text: message.interactive.button_reply.title,
                                            button_id: message.interactive.button_reply.id
                                        };
                                    } else if (message.interactive.type === 'list_reply') {
                                        // Use only the title as content, not description
                                        content = message.interactive.list_reply.title;
                                        interactiveData = {
                                            type: 'list',
                                            list_item_id: message.interactive.list_reply.id,
                                            list_item_title: message.interactive.list_reply.title,
                                            list_item_description: message.interactive.list_reply.description
                                        };
                                    } else if (message.interactive.type === 'nfm_reply') {
                                        // Handle flow responses (Name, Flow, Message replies)
                                        const flowResponse = message.interactive.nfm_reply;
                                        content = flowResponse.body || 'Flow Response';

                                        // Extract the actual flow response data from response_json
                                        let flowData = null;
                                        try {
                                            if (flowResponse.response_json) {
                                                flowData = JSON.parse(flowResponse.response_json);
                                                console.log('Parsed flow response data:', flowData);
                                            }
                                        } catch (parseError) {
                                            console.error('Error parsing flow response JSON:', parseError);
                                            // Keep the raw response_json as fallback
                                            flowData = { raw_response: flowResponse.response_json };
                                        }

                                        // Try to get field mapping to translate generated names back to original labels
                                        let fieldMapping = null;
                                        try {
                                            // Get conversation to find the flow_id from recent messages
                                            const conversation = await ConversationController.getOrCreateConversation(businessId, message.from, contactName);
                                            if (conversation) {
                                                console.log('🔍 Looking for field mappings in conversation:', conversation.id);
                                                console.log('📱 Conversation whatsapp_flow_id:', conversation.whatsapp_flow_id);
                                                console.log('🤖 Conversation bot_flow_id:', conversation.bot_flow_id);

                                                // Debug: Show all recent messages in this conversation
                                                const [allRecentMessages] = await pool.query(
                                                    `SELECT id, direction, message_type, content, flow_id, timestamp
                                                    FROM chat_messages
                                                    WHERE conversation_id = ?
                                                    ORDER BY timestamp DESC LIMIT 10`,
                                                    [conversation.id]
                                                );

                                                console.log('📋 ALL recent messages in conversation:', allRecentMessages.map(msg => ({
                                                    id: msg.id,
                                                    direction: msg.direction,
                                                    type: msg.message_type,
                                                    content: msg.content?.substring(0, 50),
                                                    flow_id: msg.flow_id,
                                                    timestamp: msg.timestamp
                                                })));

                                                // First try to find flow_id from recent chat messages (WhatsApp Flow system)
                                                const [recentMessages] = await pool.query(
                                                    `SELECT flow_id, content, timestamp FROM chat_messages
                                                    WHERE conversation_id = ? AND flow_id IS NOT NULL
                                                    ORDER BY timestamp DESC LIMIT 5`,
                                                    [conversation.id]
                                                );

                                                console.log('📋 Recent messages with flow_id:', recentMessages.map(msg => ({
                                                    flow_id: msg.flow_id,
                                                    content: msg.content,
                                                    timestamp: msg.timestamp
                                                })));

                                                if (recentMessages.length > 0) {
                                                    // Try each recent flow_id to find field mappings
                                                    for (const msg of recentMessages) {
                                                        if (msg.flow_id) {
                                                            try {
                                                                const flowModel = require('../models/flowModel');
                                                                fieldMapping = await flowModel.getReverseFieldMapping(msg.flow_id);
                                                                console.log('🎯 Retrieved field mapping for flow_id:', msg.flow_id, fieldMapping);

                                                                if (fieldMapping && Object.keys(fieldMapping).length > 0) {
                                                                    console.log('✅ Found valid field mapping:', fieldMapping);
                                                                    // Update conversation with the correct flow_id for future reference
                                                                    await pool.query(
                                                                        `UPDATE conversations SET whatsapp_flow_id = ? WHERE id = ?`,
                                                                        [msg.flow_id, conversation.id]
                                                                    );
                                                                    console.log('💾 Updated conversation whatsapp_flow_id to:', msg.flow_id);
                                                                    break;
                                                                } else {
                                                                    console.log('❌ No field mappings found for flow_id:', msg.flow_id);
                                                                }
                                                            } catch (flowError) {
                                                                console.error('❌ Error getting field mapping for flow:', msg.flow_id, flowError);
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    // Fallback: try to find flow from conversation context or recent messages
                                                    console.log('⚠️ No recent flow messages found, field mapping not available');
                                                }
                                            }
                                        } catch (mappingError) {
                                            console.error('❌ Error getting field mapping:', mappingError);
                                        }

                                        console.log('🔄 Flow data to translate:', flowData);
                                        console.log('🗺️ Available field mapping:', fieldMapping);

                                        // If we have parsed flow data, use it as the main content and translate field names
                                        if (flowData && Object.keys(flowData).length > 0) {
                                            // Create a more readable content from the flow response
                                            const translatedFields = Object.entries(flowData)
                                                .filter(([key]) => key !== 'flow_token') // Exclude flow_token from display
                                                .map(([key, value]) => {
                                                    // Try to translate the field name back to original label
                                                    const originalLabel = fieldMapping && fieldMapping[key] ? fieldMapping[key] : key;
                                                    console.log(`🔄 Translating field: ${key} = ${value} -> ${originalLabel}`);
                                                    return `${originalLabel}: ${value}`;
                                                })
                                                .join(', ');

                                            console.log('📝 Final translated content:', translatedFields);
                                            content = translatedFields || flowResponse.body || 'Flow Response';
                                            console.log('💬 Final message content set to:', content);
                                        }

                                        interactiveData = {
                                            type: 'flow',
                                            flow_name: flowResponse.name,
                                            flow_token: flowData?.flow_token,
                                            flow_response: flowData,
                                            body: flowResponse.body
                                        };
                                    }
                                    console.log('Incoming interactive message:', content, interactiveData);
                                    break;
                                case 'button':
                                    // Handle legacy button messages (WhatsApp sometimes sends these)
                                    content = message.button.text;
                                    interactiveData = {
                                        type: 'button',
                                        button_text: message.button.text,
                                        button_id: message.button.payload
                                    };
                                    console.log('Incoming button message:', content, interactiveData);
                                    break;
                                case 'sticker':
                                    content = 'Sticker';
                                    mediaFilename = message.sticker.id || 'sticker.webp';
                                    console.log('Incoming sticker message:', message.sticker);
                                    try {
                                        const mediaData = await this.downloadMedia(message.sticker.id, businessId);
                                        mediaUrl = mediaData.url;
                                        mediaFilename = mediaData.filename;
                                        fileSize = mediaData.size;
                                    } catch (mediaError) {
                                        console.error('Error downloading sticker:', mediaError);
                                        content = 'Sticker (failed to load)';
                                    }
                                    break;
                                case 'document':
                                    content = message.document.filename || 'Document';
                                    mediaFilename = message.document.filename;
                                    try {
                                        const mediaData = await this.downloadMedia(message.document.id, businessId);
                                        mediaUrl = mediaData.url;
                                        mediaFilename = mediaData.filename;
                                        fileSize = mediaData.size;
                                    } catch (mediaError) {
                                        console.error('Error downloading document:', mediaError);
                                        content = `Document: ${message.document.filename || 'Document'}`;
                                    }
                                    break;
                                case 'image':
                                    content = message.image.caption || 'Image';
                                    mediaFilename = message.image.id ? `${message.image.id}.jpg` : 'image.jpg';
                                    try {
                                        console.log(`Downloading image media: ${message.image.id} for business: ${businessId}`);
                                        const mediaData = await this.downloadMedia(message.image.id, businessId);
                                        mediaUrl = mediaData.url;
                                        mediaFilename = mediaData.filename;
                                        fileSize = mediaData.size;
                                        console.log(`Successfully downloaded image. URL: ${mediaUrl}, Filename: ${mediaFilename}`);
                                    } catch (mediaError) {
                                        console.error('Error downloading image:', mediaError);
                                        console.error('Error stack:', mediaError.stack);
                                        // Don't set content to error message, keep original caption or 'Image'
                                        // mediaUrl will remain null, which frontend will handle
                                        content = message.image.caption || 'Image';
                                    }
                                    break;
                                case 'video':
                                    content = message.video.caption || 'Video';
                                    mediaFilename = message.video.id ? `${message.video.id}.mp4` : 'video.mp4';
                                    try {
                                        const mediaData = await this.downloadMedia(message.video.id, businessId);
                                        mediaUrl = mediaData.url;
                                        mediaFilename = mediaData.filename;
                                        fileSize = mediaData.size;
                                    } catch (mediaError) {
                                        console.error('Error downloading video:', mediaError);
                                        content = 'Video (failed to load)';
                                    }
                                    break;
                                case 'audio':
                                    content = 'Audio message';
                                    mediaFilename = message.audio.id ? `${message.audio.id}.ogg` : 'audio.ogg';
                                    try {
                                        const mediaData = await this.downloadMedia(message.audio.id, businessId);
                                        mediaUrl = mediaData.url;
                                        mediaFilename = mediaData.filename;
                                        fileSize = mediaData.size;
                                    } catch (mediaError) {
                                        console.error('Error downloading audio:', mediaError);
                                        content = 'Audio message (failed to load)';
                                    }
                                    break;
                                default:
                                    content = `${message.type} message`;
                            }

                           
                            // For interactive messages, use appropriate message type
                            let finalMessageType = 'text';
                            if (message.type === 'interactive' || message.type === 'button') {
                                if (interactiveData?.type === 'flow') {
                                    finalMessageType = 'flow';
                                } else {
                                    finalMessageType = 'interactive';
                                }
                            } else {
                                finalMessageType = message.type;
                            }

                            await ConversationController.addIncomingMessage({
                                businessId,
                                phoneNumber: message.from,
                                whatsappMessageId: message.id,
                                messageType: finalMessageType,
                                content: content,
                                mediaUrl: mediaUrl,
                                mediaFilename: mediaFilename,
                                fileSize: fileSize,
                                timestamp: message.timestamp,
                                interactive: interactiveData,
                                contactName: contactName // Pass contact name for auto-creation
                            }, wss);
                            console.log('Added incoming message:', { businessId, phoneNumber: message.from, message: content, type: message.type });

                            // Check for chatbot first (takes priority over auto-reply)
                            if (content && (message.type === 'text' || message.type === 'interactive' || message.type === 'button')) {
                                const chatbotController = require('../controllers/chatbotController');

                                // Get or create conversation
                                const conversation = await ConversationController.getOrCreateConversation(businessId, message.from, contactName);

                                // Check if bot is active for this conversation AND this is NOT a WhatsApp flow response
                                if (conversation && conversation.is_bot_active && conversation.bot_flow_id && !interactiveData?.type?.includes('flow')) {
                                    console.log('Processing message with chatbot:', { conversationId: conversation.id, flowId: conversation.bot_flow_id });

                                    const messageObj = {
                                        content: content,
                                        type: message.type,
                                        interactive: interactiveData
                                    };

                                    const processed = await chatbotController.processChatbotMessageInternal(messageObj, conversation, wss);

                                    if (processed) {
                                        console.log('Message processed by chatbot');
                                        continue; // Skip auto-reply if chatbot handled it
                                    }
                                }
                            }

                            // Check for unsubscribe command (case insensitive)
                            if (content && message.type === 'text') {
                                const normalizedContent = content.trim().toLowerCase();
                                if (normalizedContent === 'stop') {
                                    console.log('Unsubscribe request received:', { businessId, phoneNumber: message.from });
                                    await this.handleUnsubscribe(businessId, message.from);
                                }
                            }

                            // Check for auto-reply after adding the message (if chatbot didn't handle it)
                            if (content && (message.type === 'text' || message.type === 'button')) {
                                console.log('Checking for auto-reply:', { businessId, phoneNumber: message.from, message: content });
                                await conversationService.checkAndSendAutoReply({
                                    businessId,
                                    phoneNumber: message.from,
                                    message: content,
                                    wss
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            //error
            console.error('Error processing incoming message:', error);
            throw error;
        }
    }

    // Handle unsubscribe request
    static async handleUnsubscribe(businessId, phoneNumber) {
        const connection = await pool.getConnection();
        try {
            // Normalize phone number
            const { normalizePhoneNumber } = require('../utils/phoneUtils');
            const normalizedPhone = normalizePhoneNumber(phoneNumber);
            
            if (!normalizedPhone) {
                console.error('Invalid phone number format for unsubscribe:', phoneNumber);
                return;
            }

            // Update all contacts with this phone number to unsubscribed
            const [result] = await connection.execute(
                `UPDATE contacts 
                SET subscribed = FALSE, updated_at = NOW()
                WHERE business_id = ? AND wanumber = ? AND subscribed = TRUE`,
                [businessId, normalizedPhone]
            );

            if (result.affectedRows > 0) {
                console.log(`Unsubscribed ${result.affectedRows} contact(s) for phone: ${normalizedPhone}`);
                
                // Optionally send confirmation message
                // You can add a confirmation message here if needed
            } else {
                console.log(`No subscribed contacts found to unsubscribe for phone: ${normalizedPhone}`);
            }
        } catch (error) {
            console.error('Error handling unsubscribe:', error);
        } finally {
            connection.release();
        }
    }
}
module.exports = WhatsAppService;