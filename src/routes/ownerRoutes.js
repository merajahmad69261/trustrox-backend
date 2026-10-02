const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const { authenticateToken, verifyRole } = require('../middleware/auth');

// Protect all store owner endpoints
router.use(authenticateToken, verifyRole(['owner']));

router.get('/dashboard', ownerController.getDashboard);

module.exports = router;
