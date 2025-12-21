# WhatsApp Template API Requirements & Conditions

This document outlines all the conditions and requirements for creating or editing WhatsApp templates and templates with buttons through the API.

## Table of Contents
1. [General Template Requirements](#general-template-requirements)
2. [Template Name Requirements](#template-name-requirements)
3. [Required Fields](#required-fields)
4. [Button Requirements](#button-requirements)
5. [Variable Requirements](#variable-requirements)
6. [Header Requirements](#header-requirements)
7. [Footer Requirements](#footer-requirements)
8. [Category Requirements](#category-requirements)
9. [Media Upload Requirements](#media-upload-requirements)
10. [API Endpoints](#api-endpoints)

---

## General Template Requirements

### Basic Structure
- **Language**: Required (ISO 639-1 language code, e.g., 'en', 'es', 'fr')
- **Category**: Required - Must be one of:
  - `marketing` - For promotional messages
  - `utility` - For transactional messages
  - `authentication` - For OTP/verification messages
- **Status**: Automatically set to `pending` when submitted to WhatsApp API

### Uniqueness Checks
- Template name must be unique in your local database
- Template name must be unique in your WhatsApp Business Account
- Both checks are performed before template creation/update

---

## Template Name Requirements

### Format Rules
- **Pattern**: Must match `/^[a-z0-9_]+$/`
  - Only lowercase letters (a-z)
  - Only numbers (0-9)
  - Only underscores (_)
  - No spaces, hyphens, or special characters
  - No uppercase letters

### Examples
✅ **Valid names:**
- `welcome_message`
- `order_confirmation_123`
- `otp_template`
- `user_verification_2024`

❌ **Invalid names:**
- `Welcome-Message` (uppercase, hyphen)
- `order confirmation` (space)
- `template@123` (special character)
- `Template_Name` (uppercase)

### Validation
- Name validation is performed both client-side and server-side
- Real-time validation checks against WhatsApp Meta API
- Duplicate names are rejected before submission

---

## Required Fields

### Mandatory Fields
1. **`name`** (string, required)
   - Must follow naming pattern above
   - Must be unique

2. **`bodyText`** (string, required)
   - Cannot be empty
   - Must contain actual message content
   - Can include variables using `{{variable_name}}` syntax

3. **`category`** (enum, required)
   - One of: `marketing`, `utility`, `authentication`

4. **`language`** (string, required)
   - ISO 639-1 language code (e.g., 'en', 'es', 'fr')

### Optional Fields
- `headerType`: 'none', 'text', 'image', 'video', 'document'
- `headerContent`: Content based on headerType
- `headerText`: Text for text-type headers
- `footerText`: Footer text (max 60 characters)
- `buttons`: Array of button objects (max 3)
- `variableSamples`: Object mapping variable names to sample values

---

## Button Requirements

### Maximum Limits
- **Maximum 3 buttons** per template (total across all button types)
- **Maximum 2 URL buttons** allowed per template
- **Only 1 phone_number button** allowed per template
- **Button text maximum: 25 characters** (enforced in UI)
- Button order is preserved (0-indexed, 0-2)

### Important Clarification
⚠️ **Note:** The limit is **3 buttons total**, not 10. Some documentation may reference:
- **Template Message Buttons** (what this system uses): Maximum 3 buttons total
- **Interactive Message Buttons** (used in regular conversations, not templates): Different limits apply

The information about "10 total buttons" and "button grouping rules" applies to **Interactive Messages** (used in chatbots/conversations), NOT to **Message Templates** (what this system creates).

### Button Types

#### 1. **URL Button** (`url`)
**Required fields:**
- `type`: `'url'`
- `text`: Button display text (required, max 25 characters)
- `value`: URL string (required)
  - Can contain variables: `https://example.com/verify?code={{code}}`
  - If URL contains variables, example value is automatically added

**Constraints:**
- **Maximum 2 URL buttons** allowed per template
- URL must be valid HTTPS URL
- URLs must be verifiable (starting January 1, 2026)

**Example:**
```json
{
  "type": "url",
  "text": "Visit Website",
  "value": "https://example.com/product/{{product_id}}"
}
```

#### 2. **Phone Number Button** (`phone_number`)
**Required fields:**
- `type`: `'phone_number'`
- `text`: Button display text (required, max 25 characters)
- `value`: Phone number in E.164 format (required)
  - Must include country code (e.g., `+1234567890`)

**Constraints:**
- Only **one phone_number button** allowed per template
- If attempting to add a second phone button, error: "Only one phone number button is allowed per template"

**Example:**
```json
{
  "type": "phone_number",
  "text": "Call Us",
  "value": "+1234567890"
}
```

#### 3. **Quick Reply Button** (`quick_reply`)
**Required fields:**
- `type`: `'quick_reply'`
- `text`: Button display text (required, max 25 characters)
- `value`: Same as text (automatically synced)

**Behavior:**
- When clicked, sends the button text back as a message
- Button becomes inactive after being clicked (to prevent duplicate responses)
- Can include optional custom payload (ID) that's returned in webhooks

**Example:**
```json
{
  "type": "quick_reply",
  "text": "Yes",
  "value": "Yes"
}
```

#### 4. **Flow Button** (`flow`)
**Required fields:**
- `type`: `'flow'`
- `text`: Button display text (required, max 25 characters)
- `whatsapp_flow_id`: WhatsApp Flow ID (required)
- `flow_id`: Internal flow ID (optional, for reference)
- `icon`: Icon type (optional, defaults to 'default')

**Constraints:**
- Must have a valid `whatsapp_flow_id` before submission
- Error if missing: "Flow button must have a whatsapp_flow_id"

**Example:**
```json
{
  "type": "flow",
  "text": "Complete Order",
  "whatsapp_flow_id": "1234567890",
  "flow_id": "internal_flow_123",
  "icon": "default"
}
```

### Button Validation Rules

**All buttons must:**
1. Have non-empty `text` field
2. Be validated before template submission
3. Follow WhatsApp API format requirements

**Type-specific validation:**
- `url` buttons: Must have valid URL in `value`
- `phone_number` buttons: Must have phone number in `value`
- `flow` buttons: Must have `whatsapp_flow_id`

**Error messages:**
- "All buttons must have text"
- "URL is required for url buttons"
- "Phone number is required for phone_number buttons"
- "Flow button must have a whatsapp_flow_id"

---

## Variable Requirements

### Variable Syntax
- Use double curly braces: `{{variable_name}}`
- Variables can be named (e.g., `{{customer_name}}`) or numbered (e.g., `{{1}}`)
- Named variables are automatically converted to numbered format for WhatsApp API

### Variable Samples
- **All variables in body text must have sample values**
- Sample values are provided in `variableSamples` object
- Missing samples will cause validation error

**Example:**
```javascript
// Body text
"Hello {{customer_name}}, your order {{order_id}} is ready!"

// Required variableSamples
{
  "customer_name": "John Doe",
  "order_id": "ORD-12345"
}
```

### Variable Processing
- Named variables are converted to numbered positions (1, 2, 3, ...)
- Order is preserved based on appearance in text
- Example values are formatted as arrays for WhatsApp API

**Error handling:**
- Error: "Please provide sample values for all placeholders: {variable_names}"

---

## Header Requirements

### Header Types

#### 1. **No Header** (`none`)
- No header component added to template

#### 2. **Text Header** (`text`)
**Required:**
- `headerType`: `'text'`
- `headerText` or `headerContent`: Text content
- Can include variables: `{{variable_name}}`

**Constraints:**
- Text length limits apply (WhatsApp API limits)

#### 3. **Image Header** (`image`)
**Required:**
- `headerType`: `'image'`
- `headerContent`: Media handle from WhatsApp upload
- File must be uploaded first to get media handle

**File requirements:**
- Format: JPEG, PNG
- Max size: 5MB
- Must upload via media upload API first

#### 4. **Video Header** (`video`)
**Required:**
- `headerType`: `'video'`
- `headerContent`: Media handle from WhatsApp upload
- File must be uploaded first to get media handle

**File requirements:**
- Format: MP4
- Max size: 16MB
- Must upload via media upload API first

#### 5. **Document Header** (`document`)
**Required:**
- `headerType`: `'document'`
- `headerContent`: Media handle from WhatsApp upload
- File must be uploaded first to get media handle

**File requirements:**
- Format: PDF
- Max size: 100MB
- Must upload via media upload API first

### Header Variable Support
- Text headers can contain variables
- Variables in headers are processed similar to body variables
- Example values must be provided for header variables

---

## Footer Requirements

### Footer Rules
- **Optional** field
- **Maximum 60 characters** (WhatsApp API limit)
- Plain text only (no variables)
- Cannot be empty if provided

---

## Category Requirements

### Marketing Templates
- Used for promotional messages
- Subject to stricter approval process
- May have additional compliance requirements
- Cannot be sent outside 24-hour messaging window

### Utility Templates
- Used for transactional messages
- Can be sent anytime (no 24-hour window restriction)
- Examples: order confirmations, shipping updates, account notifications

### Authentication Templates
- Used for OTP/verification codes
- Must be used for one-time passwords
- Can be sent anytime
- Typically have shorter approval times

---

## Media Upload Requirements

### Upload Process
1. Create upload session via `/templates/upload-media` endpoint
2. Upload file to session
3. Get media handle from response
4. Use media handle in `headerContent` field

### File Size Limits
- **Images**: 5MB max
- **Videos**: 16MB max
- **Documents**: 100MB max

### Supported Formats
- **Images**: JPEG, PNG
- **Videos**: MP4
- **Documents**: PDF

### Media Handle Format
- Media handles are returned as strings
- Format: Usually includes session ID or media ID
- Must be stored and used in template submission

---

## API Endpoints

### Create Template
**POST** `/api/templates`

**Request Body:**
```json
{
  "name": "template_name",
  "category": "marketing",
  "language": "en",
  "headerType": "text",
  "headerText": "Header text",
  "bodyText": "Body text with {{variable}}",
  "footerText": "Footer text",
  "buttons": [
    {
      "type": "url",
      "text": "Click here",
      "value": "https://example.com"
    }
  ],
  "variableSamples": {
    "variable": "Sample Value"
  }
}
```

**Validation:**
- Template name format
- Uniqueness checks
- Required fields
- Button validation
- Variable samples

### Update Template
**PUT** `/api/templates/:id`

**Constraints:**
- Template must exist
- If template has `whatsapp_id`, update is submitted to WhatsApp API
- Status resets to `pending` after update

### Save as Draft
**POST** `/api/templates/draft`

**Differences:**
- Less strict validation
- Can save incomplete templates
- Name validation only if name is provided
- No WhatsApp API submission

### Submit Draft Template
**POST** `/api/templates/:id/submit`

**Requirements:**
- Template must be in `draft` status
- All validation rules apply
- Submits to WhatsApp API

---

## WhatsApp API Submission Format

### Request Payload Structure
```json
{
  "name": "template_name",
  "language": "en",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Header text"
    },
    {
      "type": "BODY",
      "text": "Body with {{1}}",
      "example": {
        "body_text": [["Sample Value"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Footer text"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Click here",
          "url": "https://example.com"
        }
      ]
    }
  ]
}
```

### Button Format Conversion
- `url` → `URL` type
- `phone_number` → `PHONE_NUMBER` type
- `quick_reply` → `QUICK_REPLY` type
- `flow` → `FLOW` type with `flow_id`

---

## Common Validation Errors

### Template Name Errors
- "Template name must contain only lowercase letters, numbers, and underscores"
- "A template with this name already exists"
- "A template with this name already exists in your WhatsApp Business Account"

### Required Field Errors
- "Body text is required"
- "Body text cannot be empty"

### Button Errors
- "All buttons must have text"
- "URL is required for url buttons"
- "Maximum 2 URL buttons are allowed per template"
- "Phone number is required for phone_number buttons"
- "Flow button must have a whatsapp_flow_id"
- "Only one phone number button is allowed per template"
- Maximum 3 buttons limit (enforced in UI)

### Variable Errors
- "Please provide sample values for all placeholders: {variable_names}"

### Media Errors
- "Please select an image file (JPEG, PNG)"
- "Please select a video file (MP4)"
- "Please select a PDF document"
- "File size exceeds the limit"

---

## Best Practices

1. **Template Naming**
   - Use descriptive, lowercase names with underscores
   - Include version numbers if needed: `welcome_v2`
   - Keep names concise but meaningful

2. **Variables**
   - Use descriptive variable names: `{{customer_name}}` not `{{var1}}`
   - Provide realistic sample values
   - Test variable replacement before submission

3. **Buttons**
   - Use clear, action-oriented button text
   - Test URLs before submission
   - Verify phone numbers are in E.164 format
   - Ensure flow IDs are valid before adding flow buttons

4. **Content**
   - Keep body text concise and clear
   - Use footer for disclaimers or additional info
   - Follow WhatsApp content policies

5. **Testing**
   - Save as draft first to test locally
   - Validate all fields before submission
   - Check template status after submission
   - Review rejection reasons if template is rejected

---

## Status Flow

1. **Draft** → Template saved locally, not submitted
2. **Pending** → Submitted to WhatsApp, awaiting approval
3. **Approved** → Template approved and ready to use
4. **Rejected** → Template rejected, check `rejection_reason`

---

## Notes

- Templates cannot be edited once approved in WhatsApp (must create new version)
- Template updates reset status to `pending`
- WhatsApp API may take time to approve/reject templates
- Check template status periodically for updates
- Rejected templates include `rejection_reason` field with details

---

## Important Distinction: Template Buttons vs Interactive Message Buttons

### Template Message Buttons (This System)
- **Maximum: 3 buttons total**
- Used in **Message Templates** (approved templates sent to users)
- Button types: `quick_reply`, `url`, `phone_number`, `flow`
- All buttons are sent together in the template
- Subject to template approval process

### Interactive Message Buttons (Different System)
- **Maximum: 10 buttons** (3 quick reply + up to 2 CTA buttons)
- Used in **regular conversations** (not templates)
- Sent as interactive messages in chatbot/conversation flows
- Different API endpoint and structure
- No approval process needed

**⚠️ Common Confusion:**
The information about "10 total buttons" and "button grouping rules" refers to **Interactive Messages** used in chatbots, NOT to **Message Templates**. This codebase creates **Message Templates**, which have a **maximum of 3 buttons total**.

### Why the Confusion?
Some documentation sources mix these two concepts:
1. **Template Buttons** - Part of approved message templates (limit: 3)
2. **Interactive Buttons** - Part of regular conversation messages (limit: 10)

This codebase implements **Template Buttons** only, which is why the limit is 3 buttons.
