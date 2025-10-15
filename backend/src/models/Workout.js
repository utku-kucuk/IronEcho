const mongoose = require('mongoose');

const setSchema = new mongoose.Schema({
  reps: {
    type: Number,
    required: true,
    min: 1
  },
  weight: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    maxlength: 200
  }
}, { _id: false });

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  muscleGroup: {
    type: String,
    required: true,
    enum: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'other']
  },
  equipment: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['strength', 'bodyweight', 'cardio'],
    required: true
  },
  weightBased: {
    type: Boolean,
    default: true
  },
  sets: [setSchema]
}, { _id: false });

const workoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  warmup: {
    type: {
      type: String,
      trim: true
    },
    duration: {
      type: Number, // in minutes
      min: 0
    },
    speed: {
      type: Number, // km/h or mph
      min: 0
    }
  },
  exercises: [exerciseSchema],
  notes: {
    type: String,
    maxlength: 500
  },
  totalVolume: {
    type: Number,
    default: 0
  },
  isPR: {
    type: Boolean,
    default: false
  },
  // For sync conflict resolution
  lastModified: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Client-side timestamp for conflict resolution
  clientTimestamp: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Calculate total volume before saving
workoutSchema.pre('save', function(next) {
  this.totalVolume = this.exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((exerciseTotal, set) => {
      return exerciseTotal + (set.weight || 0) * set.reps;
    }, 0);
  }, 0);
  next();
});

// Indexes for performance
workoutSchema.index({ userId: 1, date: -1 });
workoutSchema.index({ userId: 1, 'exercises.name': 1, date: -1 });
workoutSchema.index({ userId: 1, lastModified: -1 });

module.exports = mongoose.model('Workout', workoutSchema);
