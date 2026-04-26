const asyncHandler = require('express-async-handler');
const axios = require('axios');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// @desc    Get route estimate
// @route   POST /api/ai/route
const routeEstimate = asyncHandler(async (req, res) => {
  const { source, destination } = req.body;
  if (!source || !destination) {
    res.status(400);
    throw new Error('source and destination are required');
  }

  try {
    const response = await axios.post(
      `${AI_URL}/route/estimate`,
      { source, destination },
      { timeout: 8000 }
    );
    res.json(response.data);
  } catch (err) {
    console.error('AI route error:', err.message);
    res.status(502).json({
      message: 'AI service unavailable',
      error: err.message,
    });
  }
});

// @desc    Predict fuel
// @route   POST /api/ai/fuel
const predictFuel = asyncHandler(async (req, res) => {
  const { distance_km, vehicle_type, mileage_kmpl, load_kg } = req.body;
  if (!distance_km || !vehicle_type) {
    res.status(400);
    throw new Error('distance_km and vehicle_type are required');
  }

  try {
    const response = await axios.post(
      `${AI_URL}/predict/fuel`,
      { distance_km, vehicle_type, mileage_kmpl, load_kg },
      { timeout: 8000 }
    );
    res.json(response.data);
  } catch (err) {
    console.error('AI fuel error:', err.message);
    res.status(502).json({
      message: 'AI service unavailable',
      error: err.message,
    });
  }
});

// @desc    AI service health
// @route   GET /api/ai/health
const aiHealth = asyncHandler(async (req, res) => {
  try {
    const response = await axios.get(`${AI_URL}/health`, { timeout: 3000 });
    res.json({ ai: 'ok', ...response.data });
  } catch (err) {
    res.status(502).json({ ai: 'down', error: err.message });
  }
});

module.exports = { routeEstimate, predictFuel, aiHealth };
