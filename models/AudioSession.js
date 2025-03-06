const { Schema, model } = require('mongoose');

const GestureEffectSchema = new Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['pitch', 'harmony', 'volume', 'tempo'] // Add other effect types as needed
  },
  parameters: {
    type: Object,
    required: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

const AudioSessionSchema = new Schema({
  userId: { 
    type: String, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  currentEffects: [GestureEffectSchema],
  startedAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = model('AudioSession', AudioSessionSchema);