const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { authenticateToken, verifyRole } = require('../middleware/auth');
const { addUserAdminSchema, addStoreSchema } = require('../utils/validators');

// Protect all admin endpoints
router.use(authenticateToken, verifyRole(['admin']));

router.get('/dashboard', adminController.getDashboard);
router.post('/users', validate(addUserAdminSchema), adminController.createUser);
router.post('/stores', validate(addStoreSchema), adminController.createStore);
router.get('/stores', adminController.getStores);
router.get('/users', adminController.getUsers);

module.exports = router;
