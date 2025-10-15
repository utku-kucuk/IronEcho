const express = require('express');
const Joi = require('joi');
const Measurement = require('../models/Measurement');

const router = express.Router();

// Validation schema
const measurementSchema = Joi.object({
  date: Joi.date().required(),
  measurements: Joi.object({
    neck: Joi.number().min(0).optional(),
    waist: Joi.number().min(0).optional(),
    chest: Joi.number().min(0).optional(),
    hips: Joi.number().min(0).optional(),
    thighLeft: Joi.number().min(0).optional(),
    thighRight: Joi.number().min(0).optional(),
    armLeftRelaxed: Joi.number().min(0).optional(),
    armRightRelaxed: Joi.number().min(0).optional(),
    armLeftContracted: Joi.number().min(0).optional(),
    armRightContracted: Joi.number().min(0).optional()
  }).required(),
  weight: Joi.number().min(0).optional(),
  bodyFat: Joi.number().min(0).max(100).optional(),
  notes: Joi.string().max(500).optional(),
  photos: Joi.array().items(Joi.object({
    uri: Joi.string().required(),
    date: Joi.date().default(Date.now),
    type: Joi.string().valid('before', 'after', 'progress').default('progress')
  })).optional(),
  clientTimestamp: Joi.date().required()
});

// GET /api/measurements - Get user's measurements
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate 
    } = req.query;

    const filter = { userId: req.userId };

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const measurements = await Measurement.find(filter)
      .sort({ date: -1, lastModified: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Measurement.countDocuments(filter);

    res.json({
      measurements,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get measurements error:', error);
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
});

// GET /api/measurements/:id - Get specific measurement
router.get('/:id', async (req, res) => {
  try {
    const measurement = await Measurement.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!measurement) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    res.json(measurement);

  } catch (error) {
    console.error('Get measurement error:', error);
    res.status(500).json({ error: 'Failed to fetch measurement' });
  }
});

// POST /api/measurements - Create new measurement
router.post('/', async (req, res) => {
  try {
    const { error, value } = measurementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const measurement = new Measurement({
      ...value,
      userId: req.userId,
      lastModified: new Date()
    });

    await measurement.save();

    // Emit real-time update
    req.io.to(`user_${req.userId}`).emit('measurement_created', measurement);

    res.status(201).json(measurement);

  } catch (error) {
    console.error('Create measurement error:', error);
    res.status(500).json({ error: 'Failed to create measurement' });
  }
});

// PUT /api/measurements/:id - Update measurement
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = measurementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const measurement = await Measurement.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        ...value, 
        lastModified: new Date() 
      },
      { new: true, runValidators: true }
    );

    if (!measurement) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    // Emit real-time update
    req.io.to(`user_${req.userId}`).emit('measurement_updated', measurement);

    res.json(measurement);

  } catch (error) {
    console.error('Update measurement error:', error);
    res.status(500).json({ error: 'Failed to update measurement' });
  }
});

// DELETE /api/measurements/:id - Delete measurement
router.delete('/:id', async (req, res) => {
  try {
    const measurement = await Measurement.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!measurement) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    // Emit real-time update
    req.io.to(`user_${req.userId}`).emit('measurement_deleted', { id: req.params.id });

    res.json({ message: 'Measurement deleted successfully' });

  } catch (error) {
    console.error('Delete measurement error:', error);
    res.status(500).json({ error: 'Failed to delete measurement' });
  }
});

module.exports = router;
