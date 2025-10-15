const express = require('express');
const Joi = require('joi');
const Workout = require('../models/Workout');

const router = express.Router();

// Validation schemas
const setSchema = Joi.object({
  reps: Joi.number().integer().min(1).required(),
  weight: Joi.number().min(0).optional(),
  notes: Joi.string().max(200).optional()
});

const exerciseSchema = Joi.object({
  name: Joi.string().trim().required(),
  muscleGroup: Joi.string().valid('chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'other').required(),
  equipment: Joi.string().trim().optional(),
  type: Joi.string().valid('strength', 'bodyweight', 'cardio').required(),
  weightBased: Joi.boolean().default(true),
  sets: Joi.array().items(setSchema).min(1).required()
});

const workoutSchema = Joi.object({
  date: Joi.date().required(),
  warmup: Joi.object({
    type: Joi.string().trim().optional(),
    duration: Joi.number().min(0).optional(),
    speed: Joi.number().min(0).optional()
  }).optional(),
  exercises: Joi.array().items(exerciseSchema).min(1).required(),
  notes: Joi.string().max(500).optional(),
  clientTimestamp: Joi.date().required()
});

// GET /api/workouts - Get user's workouts with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate, 
      exercise, 
      muscleGroup 
    } = req.query;

    const filter = { userId: req.userId };

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Exercise name filter
    if (exercise) {
      filter['exercises.name'] = new RegExp(exercise, 'i');
    }

    // Muscle group filter
    if (muscleGroup) {
      filter['exercises.muscleGroup'] = muscleGroup;
    }

    const workouts = await Workout.find(filter)
      .sort({ date: -1, lastModified: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Workout.countDocuments(filter);

    res.json({
      workouts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// GET /api/workouts/:id - Get specific workout
router.get('/:id', async (req, res) => {
  try {
    const workout = await Workout.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json(workout);

  } catch (error) {
    console.error('Get workout error:', error);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

// POST /api/workouts - Create new workout
router.post('/', async (req, res) => {
  try {
    const { error, value } = workoutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const workout = new Workout({
      ...value,
      userId: req.userId,
      lastModified: new Date()
    });

    await workout.save();

    // Emit real-time update
    req.io.to(`user_${req.userId}`).emit('workout_created', workout);

    res.status(201).json(workout);

  } catch (error) {
    console.error('Create workout error:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// PUT /api/workouts/:id - Update workout
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = workoutSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        ...value, 
        lastModified: new Date() 
      },
      { new: true, runValidators: true }
    );

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Emit real-time update
    req.io.to(`user_${req.userId}`).emit('workout_updated', workout);

    res.json(workout);

  } catch (error) {
    console.error('Update workout error:', error);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// DELETE /api/workouts/:id - Delete workout
router.delete('/:id', async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Emit real-time update
    req.io.to(`user_${req.userId}`).emit('workout_deleted', { id: req.params.id });

    res.json({ message: 'Workout deleted successfully' });

  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// GET /api/workouts/stats/exercise/:exerciseName - Get exercise statistics
router.get('/stats/exercise/:exerciseName', async (req, res) => {
  try {
    const { exerciseName } = req.params;
    const { limit = 50 } = req.query;

    const workouts = await Workout.find({
      userId: req.userId,
      'exercises.name': new RegExp(exerciseName, 'i')
    })
    .sort({ date: -1 })
    .limit(parseInt(limit))
    .lean();

    // Process exercise data for charts
    const exerciseData = [];
    
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        if (exercise.name.toLowerCase().includes(exerciseName.toLowerCase())) {
          exercise.sets.forEach(set => {
            exerciseData.push({
              date: workout.date,
              reps: set.reps,
              weight: set.weight || 0,
              volume: (set.weight || 0) * set.reps
            });
          });
        }
      });
    });

    res.json({
      exerciseName,
      data: exerciseData,
      totalWorkouts: workouts.length
    });

  } catch (error) {
    console.error('Get exercise stats error:', error);
    res.status(500).json({ error: 'Failed to fetch exercise statistics' });
  }
});

module.exports = router;
