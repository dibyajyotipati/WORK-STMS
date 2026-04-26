const express = require('express');
const router = express.Router();
const { routeEstimate, predictFuel, aiHealth } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/route', routeEstimate);
router.post('/fuel', predictFuel);
router.get('/health', aiHealth);

module.exports = router;
