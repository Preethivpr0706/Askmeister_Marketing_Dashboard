const express = require('express');
const { body, param, query } = require('express-validator');
const flowController = require('../controllers/flowController');


const router = express.Router();

// Validation middleware
const validateFlow = [
  body('name')
    .notEmpty()
    .withMessage('Flow name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Flow name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('version')
    .optional()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('Version must be in format x.y.z'),
  body('category')
    .optional()
    .isIn(['LEAD_GENERATION', 'CUSTOMER_SUPPORT', 'SIGN_UP', 'SIGN_IN', 'APPOINTMENT_BOOKING', 'SHOPPING', 'CONTACT_US', 'SURVEY', 'OTHER'])
    .withMessage('Invalid category'),
  body('language')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Language code must be between 2 and 10 characters'),
  body('flow_data')
    .optional()
    .isObject()
    .withMessage('Flow data must be an object')
];

const validateFlowUpdate = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Flow name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('version')
    .optional()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('Version must be in format x.y.z'),
  body('category')
    .optional()
    .isIn(['LEAD_GENERATION', 'CUSTOMER_SUPPORT', 'SIGN_UP', 'SIGN_IN', 'APPOINTMENT_BOOKING', 'SHOPPING', 'CONTACT_US', 'SURVEY', 'OTHER'])
    .withMessage('Invalid category'),
  body('language')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Language code must be between 2 and 10 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'approved', 'rejected', 'published'])
    .withMessage('Invalid status'),
  body('flow_data')
    .optional()
    .isObject()
    .withMessage('Flow data must be an object')
];

const validateFlowStructure = [
  body('nodes')
    .isArray({ min: 1 })
    .withMessage('Flow must have at least one node'),
  body('nodes.*.id')
    .notEmpty()
    .withMessage('Each node must have an ID'),
  body('nodes.*.type')
    .notEmpty()
    .isIn(['screen', 'form', 'list_picker', 'confirmation', 'text', 'image', 'button', 'condition'])
    .withMessage('Invalid node type'),
  body('edges')
    .isArray()
    .withMessage('Edges must be an array'),
  body('edges.*.source')
    .notEmpty()
    .withMessage('Each edge must have a source'),
  body('edges.*.target')
    .notEmpty()
    .withMessage('Each edge must have a target')
];

const validateFlowId = [
  param('id')
    .isUUID()
    .withMessage('Invalid flow ID format')
];

const validatePhoneNumber = [
  body('phone_number')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format')
];

const validateDuplicateFlow = [
  body('name')
    .notEmpty()
    .withMessage('Flow name is required for duplication')
    .isLength({ min: 1, max: 255 })
    .withMessage('Flow name must be between 1 and 255 characters')
];

const validateImportFlow = [
  body('flow_data')
    .notEmpty()
    .withMessage('Flow data is required for import'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Flow name must be between 1 and 255 characters')
];


/**
 * @route   POST /api/flows
 * @desc    Create a new flow
 * @access  Private
 */
router.post('/', validateFlow, flowController.createFlow);

/**
 * @route   POST /api/flows/import
 * @desc    Import flow from JSON
 * @access  Private
 */
router.post('/import', validateImportFlow, flowController.importFlow);

/**
 * @route   GET /api/flows
 * @desc    Get all flows for the authenticated business
 * @access  Private
 */
router.get('/', [
  query('status')
    .optional()
    .isIn(['draft', 'pending', 'approved', 'rejected', 'published'])
    .withMessage('Invalid status filter'),
  query('category')
    .optional()
    .isIn(['LEAD_GENERATION', 'CUSTOMER_SUPPORT', 'SIGN_UP', 'SIGN_IN', 'APPOINTMENT_BOOKING', 'SHOPPING', 'CONTACT_US', 'SURVEY', 'OTHER'])
    .withMessage('Invalid category filter'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Search term must be between 1 and 255 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], flowController.getFlows);

/**
 * @route   GET /api/flows/:id
 * @desc    Get a specific flow by ID
 * @access  Private
 */
router.get('/:id', validateFlowId, flowController.getFlowById);

/**
 * @route   PUT /api/flows/:id
 * @desc    Update a flow
 * @access  Private
 */
router.put('/:id', [...validateFlowId, ...validateFlowUpdate], flowController.updateFlow);

/**
 * @route   DELETE /api/flows/:id
 * @desc    Delete a flow
 * @access  Private
 */
router.delete('/:id', validateFlowId, flowController.deleteFlow);

/**
 * @route   POST /api/flows/:id/duplicate
 * @desc    Duplicate a flow
 * @access  Private
 */
router.post('/:id/duplicate', [...validateFlowId, ...validateDuplicateFlow], flowController.duplicateFlow);

/**
 * @route   POST /api/flows/:id/structure
 * @desc    Save flow structure (nodes and edges)
 * @access  Private
 */
router.post('/:id/structure', [...validateFlowId, ...validateFlowStructure], flowController.saveFlowStructure);

/**
 * @route   POST /api/flows/validate
 * @desc    Validate flow structure
 * @access  Private
 */
router.post('/validate', [
  body('flow_data')
    .notEmpty()
    .withMessage('Flow data is required for validation')
    .isObject()
    .withMessage('Flow data must be an object')
], flowController.validateFlow);

/**
 * @route   POST /api/flows/:id/publish
 * @desc    Publish flow to WhatsApp API
 * @access  Private
 */
router.post('/:id/publish', validateFlowId, flowController.publishFlow);

/**
 * @route   POST /api/flows/:id/test
 * @desc    Test flow by sending to a test number
 * @access  Private
 */
router.post('/:id/test', [...validateFlowId, ...validatePhoneNumber], flowController.testFlow);

/**
 * @route   GET /api/flows/:id/analytics
 * @desc    Get flow analytics
 * @access  Private
 */
router.get('/:id/analytics', [
  ...validateFlowId,
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
], flowController.getFlowAnalytics);


/**
 * @route   GET /api/flows/:id/export
 * @desc    Export flow as JSON
 * @access  Private
 */
router.get('/:id/export', validateFlowId, flowController.exportFlow);

/**
 * @route   GET /api/flows/:id/field-mappings
 * @desc    Get field mappings for a flow
 * @access  Private
 */
router.get('/:id/field-mappings', validateFlowId, flowController.getFieldMappings);
module.exports = router;