const express = require('express');
const Workout = require('../models/Workout');
const Measurement = require('../models/Measurement');

const router = express.Router();

// GET /api/stats/summary - Get user's fitness summary
router.get('/summary', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get workout statistics
    const workoutStats = await Workout.aggregate([
      {
        $match: {
          userId: req.userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalWorkouts: { $sum: 1 },
          totalVolume: { $sum: '$totalVolume' },
          avgVolumePerWorkout: { $avg: '$totalVolume' },
          prCount: { $sum: { $cond: ['$isPR', 1, 0] } }
        }
      }
    ]);

    // Get exercise frequency
    const exerciseFrequency = await Workout.aggregate([
      {
        $match: {
          userId: req.userId,
          date: { $gte: startDate }
        }
      },
      { $unwind: '$exercises' },
      {
        $group: {
          _id: '$exercises.name',
          count: { $sum: 1 },
          totalVolume: { $sum: { $multiply: ['$exercises.sets.weight', '$exercises.sets.reps'] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get weekly workout distribution
    const weeklyStats = await Workout.aggregate([
      {
        $match: {
          userId: req.userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            week: { $week: '$date' }
          },
          workoutCount: { $sum: 1 },
          totalVolume: { $sum: '$totalVolume' }
        }
      },
      { $sort: { '_id.year': -1, '_id.week': -1 } }
    ]);

    // Get latest measurements
    const latestMeasurement = await Measurement.findOne({
      userId: req.userId
    }).sort({ date: -1 });

    res.json({
      period: parseInt(period),
      workoutStats: workoutStats[0] || {
        totalWorkouts: 0,
        totalVolume: 0,
        avgVolumePerWorkout: 0,
        prCount: 0
      },
      exerciseFrequency,
      weeklyStats,
      latestMeasurement
    });

  } catch (error) {
    console.error('Get stats summary error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/stats/progress/:exerciseName - Get exercise progress over time
router.get('/progress/:exerciseName', async (req, res) => {
  try {
    const { exerciseName } = req.params;
    const { period = '90' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const progressData = await Workout.aggregate([
      {
        $match: {
          userId: req.userId,
          'exercises.name': new RegExp(exerciseName, 'i'),
          date: { $gte: startDate }
        }
      },
      { $unwind: '$exercises' },
      {
        $match: {
          'exercises.name': new RegExp(exerciseName, 'i')
        }
      },
      { $unwind: '$exercises.sets' },
      {
        $group: {
          _id: {
            date: '$date',
            exercise: '$exercises.name'
          },
          maxWeight: { $max: '$exercises.sets.weight' },
          maxReps: { $max: '$exercises.sets.reps' },
          totalVolume: { $sum: { $multiply: ['$exercises.sets.weight', '$exercises.sets.reps'] } },
          setCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      exerciseName,
      period: parseInt(period),
      data: progressData
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// GET /api/stats/measurements - Get measurement trends
router.get('/measurements', async (req, res) => {
  try {
    const { period = '365' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const measurements = await Measurement.find({
      userId: req.userId,
      date: { $gte: startDate }
    })
    .sort({ date: 1 })
    .select('date measurements weight bodyFat')
    .lean();

    // Process data for charts
    const trends = {
      weight: measurements.map(m => ({ date: m.date, value: m.weight })).filter(m => m.value),
      bodyFat: measurements.map(m => ({ date: m.date, value: m.bodyFat })).filter(m => m.value),
      measurements: measurements.map(m => ({
        date: m.date,
        ...m.measurements
      }))
    };

    res.json({
      period: parseInt(period),
      trends
    });

  } catch (error) {
    console.error('Get measurement trends error:', error);
    res.status(500).json({ error: 'Failed to fetch measurement trends' });
  }
});

module.exports = router;
