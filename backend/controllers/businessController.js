const Business = require('../models/businessModel');
const { uploadToLocal } = require('../services/fileUploadService');
const path = require('path');
const fs = require('fs');
class BusinessController {
    static async getBusinessDetails(req, res) {
            try {
                // For testing, let's hardcode a user ID
                const userId = req.user.id;

                const business = await Business.getByUserId(userId);

                if (!business) {
                    // If no business exists, create a default one
                    return res.status(200).json({
                        success: true,
                        data: {
                            name: 'Your Business',
                            profile_image_url: null
                        }
                    });
                }

                res.status(200).json({
                    success: true,
                    data: business
                });
            } catch (error) {
                console.error('Error in getBusinessDetails:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to get business details',
                    error: error.message
                });
            }
        }
        // businessController.js
    static async updateBusinessDetails(req, res) {
        try {
            const userId = req.user.id;
            const { user, business } = req.body; // Change to match frontend data structure

            console.log('Updating business details:', { userId, user, business }); // Debug log

            const updatedBusiness = await Business.update(userId, {
                user,
                business
            });

            res.json({
                success: true,
                data: updatedBusiness,
                message: 'Business details updated successfully'
            });
        } catch (error) {
            console.error('Error updating business details:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update business details',
                error: error.message
            });
        }
    }


    static async uploadProfileImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            console.log('Received file:', req.file.originalname);

            // Verify upload directory exists
            const uploadDir = path.join(__dirname, '../public/uploads/business-profile');
            const dirExists = fs.existsSync(uploadDir);
            console.log('Upload directory exists:', dirExists, 'at:', uploadDir);

            if (!dirExists) {
                throw new Error('Upload directory does not exist');
            }

            const filePath = await uploadToLocal(req.file.buffer, req.file.originalname);
            const absolutePath = path.join(__dirname, '../public', filePath);

            // Verify file was actually written
            const fileExists = fs.existsSync(absolutePath);
            console.log('File exists on disk:', fileExists, 'at:', absolutePath);

            if (!fileExists) {
                throw new Error('File was not saved to disk');
            }

            const absoluteUrl = `${req.protocol}://${req.get('host')}${filePath}`;
            console.log("userid", req.user.id)
                // Update database
            const updatedBusiness = await Business.updateProfileImage(req.user.id, absoluteUrl);

            return res.json({
                success: true,
                data: {
                    profileImageUrl: absoluteUrl,
                    fileSaved: true,
                    filePath: absolutePath
                }
            });

        } catch (error) {
            console.error('Upload failed:', {
                error: error.message,
                stack: error.stack
            });
            return res.status(500).json({
                success: false,
                message: 'Upload failed',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async getAllBusinesses(req, res) {
        try {
            const businesses = await Business.getAll();
            res.status(200).json({
                success: true,
                data: businesses
            });
        } catch (error) {
            console.error('Error in getAllBusinesses:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get businesses',
                error: error.message
            });
        }
    }

    static async getBusinessById(req, res) {
        try {
            const { id } = req.params;
            const business = await Business.getById(id);

            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: 'Business not found'
                });
            }

            res.status(200).json({
                success: true,
                data: business
            });
        } catch (error) {
            console.error('Error in getBusinessById:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get business',
                error: error.message
            });
        }
    }

    static async createBusiness(req, res) {
        try {
            const { name, description, profile_image_url, industry, size, contact_email, contact_phone, website } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Business name is required'
                });
            }

            const newBusiness = await Business.create({
                name,
                description,
                profile_image_url,
                industry: industry || 'technology',
                size: size || 'medium',
                contact_email,
                contact_phone,
                website
            });

            res.status(201).json({
                success: true,
                data: newBusiness,
                message: 'Business created successfully'
            });
        } catch (error) {
            console.error('Error in createBusiness:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create business',
                error: error.message
            });
        }
    }

    static async updateBusiness(req, res) {
        try {
            const { id } = req.params;
            const { name, description, profile_image_url, industry, size, contact_email, contact_phone, website } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Business name is required'
                });
            }

            // Check if business exists
            const existingBusiness = await Business.getById(id);
            if (!existingBusiness) {
                return res.status(404).json({
                    success: false,
                    message: 'Business not found'
                });
            }

            const updatedBusiness = await Business.update(id, {
                name,
                description,
                profile_image_url,
                industry,
                size,
                contact_email,
                contact_phone,
                website
            });

            res.status(200).json({
                success: true,
                data: updatedBusiness,
                message: 'Business updated successfully'
            });
        } catch (error) {
            console.error('Error in updateBusiness:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update business',
                error: error.message
            });
        }
    }

    static async deleteBusiness(req, res) {
        try {
            const { id } = req.params;

            const result = await Business.delete(id);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error in deleteBusiness:', error);
            if (error.message === 'Cannot delete business with existing users') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to delete business',
                error: error.message
            });
        }
    }

    static async getBusinessSettings(req, res) {
        try {
            const { id } = req.params;
            const settings = await Business.getBusinessSettings(id);

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Business settings not found'
                });
            }

            res.status(200).json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('Error in getBusinessSettings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get business settings',
                error: error.message
            });
        }
    }

    static async updateBusinessSettings(req, res) {
        try {
            const { id } = req.params;
            const { whatsapp_api_token, whatsapp_business_account_id, whatsapp_phone_number_id, facebook_app_id, webhook_verify_token } = req.body;

            // Check if business exists
            const business = await Business.getById(id);
            if (!business) {
                return res.status(404).json({
                    success: false,
                    message: 'Business not found'
                });
            }

            const updatedSettings = await Business.updateBusinessSettings(id, {
                whatsapp_api_token,
                whatsapp_business_account_id,
                whatsapp_phone_number_id,
                facebook_app_id,
                webhook_verify_token
            });

            res.status(200).json({
                success: true,
                data: updatedSettings,
                message: 'Business settings updated successfully'
            });
        } catch (error) {
            console.error('Error in updateBusinessSettings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update business settings',
                error: error.message
            });
        }
    }
}

module.exports = BusinessController;