/**
 * Defines Mongoose schemas for audio sessions and gesture effects.
 */
const { Schema, model } = require('mongoose');

/**
 * Schema representing a single gesture effect applied during an audio session.
 */
const GestureEffectSchema = new Schema({
  /** Type of the effect (e.g., pitch, harmony). */
  type: { 
    type: String, 
    required: true,
    enum: ['pitch', 'harmony', 'volume', 'tempo'] // Add other effect types as needed
  },
  /** Parameters specific to the effect type. */
  parameters: {
    type: Object,
    required: true
  },
  /** Timestamp when the effect was applied. */
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

/**
 * Schema representing an active audio interaction session.
 */
const AudioSessionSchema = new Schema({
  /** Identifier for the user associated with the session. */
  userId: { 
    type: String, 
    required: true 
  },
  /** Flag indicating if the session is currently active. */
  isActive: { 
    type: Boolean, 
    default: true 
  },
  /** Array of gesture effects applied during the session. */
  currentEffects: [GestureEffectSchema],
  /** Timestamp when the session started. */
  startedAt: { 
    type: Date, 
    default: Date.now 
  },
  /** Path to the audio recording file associated with the session (if any). */
  recordingPath: {
    type: String,
    default: null
  }
});

module.exports = model('AudioSession', AudioSessionSchema);