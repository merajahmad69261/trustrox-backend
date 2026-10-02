const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { authenticateToken, verifyRole } = require('../middleware/auth');
const { submitRatingSchema, updateRatingSchema } = require('../utils/validators');

// Protect all user endpoints (Normal User only)
router.use(authenticateToken, verifyRole(['user']));

router.get('/stores', userController.getStores);
router.post('/ratings', validate(submitRatingSchema), userController.submitRating);
router.put('/ratings/:ratingId', validate(updateRatingSchema), userController.updateRating);

module.exports = router;
