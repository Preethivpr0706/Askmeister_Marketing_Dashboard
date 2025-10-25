// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const BusinessController = require('../controllers/businessController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// User Management Routes
router.get('/users', UserController.getAllUsers);
router.get('/users/:id', UserController.getUserById);
router.post('/users', UserController.createUser);
router.put('/users/:id', UserController.updateUser);
router.delete('/users/:id', UserController.deleteUser);
router.get('/businesses/:businessId/users', UserController.getUsersByBusiness);
router.get('/roles/:role/users', UserController.getUsersByRole);
router.post('/users/:id/reset-password', UserController.resetUserPassword);

// Business Management Routes
router.get('/businesses', BusinessController.getAllBusinesses);
router.get('/businesses/:id', BusinessController.getBusinessById);
router.post('/businesses', BusinessController.createBusiness);
router.put('/businesses/:id', BusinessController.updateBusiness);
router.delete('/businesses/:id', BusinessController.deleteBusiness);
router.get('/businesses/:id/settings', BusinessController.getBusinessSettings);
router.put('/businesses/:id/settings', BusinessController.updateBusinessSettings);

module.exports = router;
