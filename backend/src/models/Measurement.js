const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema({
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
  measurements: {
    neck: {
      type: Number,
      min: 0
    },
    waist: {
      type: Number,
      min: 0
    },
    chest: {
      type: Number,
      min: 0
    },
    hips: {
      type: Number,
      min: 0
    },
    thighLeft: {
      type: Number,
      min: 0
    },
    thighRight: {
      type: Number,
      min: 0
    },
    armLeftRelaxed: {
      type: Number,
      min: 0
    },
    armRightRelaxed: {
      type: Number,
      min: 0
    },
    armLeftContracted: {
      type: Number,
      min: 0
    },
    armRightContracted: {
      type: Number,
      min: 0
    }
  },
  weight: {
    type: Number,
    min: 0
  },
  bodyFat: {
    type: Number,
    min: 0,
    max: 100
  },
  notes: {
    type: String,
    maxlength: 500
  },
  photos: [{
    uri: String,
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['before', 'after', 'progress'],
      default: 'progress'
    }
  }],
  // For sync conflict resolution
  lastModified: {
    type: Date,
    default: Date.now,
    index: true
  },
  clientTimestamp: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
measurementSchema.index({ userId: 1, date: -1 });
measurementSchema.index({ userId: 1, lastModified: -1 });

module.exports = mongoose.model('Measurement', measurementSchema);
