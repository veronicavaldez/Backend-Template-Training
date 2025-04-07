/*

# 
the code below will be changed to whichever name your type is, but the structure will stay the same!
Ex:

const artistsResolvers = require('./artists');

module.exports = artistsResolvers;

if you have multiple types, it might look a little more like the following:

const postsResolvers = require('./posts');
const usersResolvers = require('./users');
const commentsResolvers = require('./comments')

module.exports = {
    Post: {
        likeCount: (parent) => parent.likes.length,
        commentCount: (parent) => parent.comments.length
      },
    Query: {

        ...postsResolvers.Query
    },
    Mutation: {
        ...usersResolvers.Mutation,
        ...postsResolvers.Mutation,
        ...commentsResolvers.Mutation
    }

};
*/

const AudioSession = require('../../models/AudioSession');
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();
const mongoose = require('mongoose');

const EFFECT_APPLIED = 'EFFECT_APPLIED';
const SESSION_UPDATED = 'SESSION_UPDATED';

module.exports = {
  Query: {
    getActiveSession: async (_, { userId }) => {
      try {
        return await AudioSession.findOne({ 
          userId, 
          isActive: true 
        });
      } catch (error) {
        throw new Error('Error fetching active session');
      }
    },

    getCurrentEffects: async (_, { sessionId }) => {
      try {
        const session = await AudioSession.findById(sessionId);
        if (!session) throw new Error('Session not found');
        return session.currentEffects;
      } catch (error) {
        throw new Error('Error fetching effects');
      }
    },

    getUserSessions: async (_, { userId }) => {
      try {
        console.log(`Fetching sessions for user: ${userId}`);
        // Find all sessions for this user, sorted by startedAt in descending order
        const sessions = await AudioSession.find({ userId }).sort({ startedAt: -1 });
        console.log(`Found ${sessions.length} sessions`);
        return sessions;
      } catch (error) {
        console.error('Error fetching user sessions:', error);
        throw new Error(`Error fetching user sessions: ${error.message}`);
      }
    }
  },

  Mutation: {
    startSession: async (_, __, { userId = 'temp-user' }) => {
      try {
        // End any existing active sessions
        await AudioSession.updateMany(
          { userId, isActive: true },
          { isActive: false }
        );

        // Create new session
        const session = new AudioSession({ userId });
        await session.save();

        pubsub.publish(SESSION_UPDATED, {
          sessionUpdated: session
        });

        return session;
      } catch (error) {
        throw new Error('Error starting session');
      }
    },

    endSession: async (_, { sessionId }) => {
      try {
        const session = await AudioSession.findByIdAndUpdate(
          sessionId,
          { isActive: false },
          { new: true }
        );

        pubsub.publish(SESSION_UPDATED, {
          sessionUpdated: session
        });

        return true;
      } catch (error) {
        throw new Error('Error ending session');
      }
    },

    applyGestureEffect: async (_, { sessionId, type, parameters }) => {
      try {
        const session = await AudioSession.findById(sessionId);
        if (!session) throw new Error('Session not found');
        if (!session.isActive) throw new Error('Session is not active');

        const effect = {
          id: new mongoose.Types.ObjectId(),
          type,
          parameters,
          timestamp: new Date()
        };

        session.currentEffects.push(effect);
        await session.save();

        pubsub.publish(EFFECT_APPLIED, {
          effectApplied: effect,
          sessionId
        });

        return effect;
      } catch (error) {
        throw new Error('Error applying effect');
      }
    },

    addRecordingToSession: async (_, { sessionId, recordingPath }) => {
      try {
        // Find and update the session with the new recording path
        const session = await AudioSession.findByIdAndUpdate(
          sessionId,
          { 
            $set: { recordingPath: recordingPath },
            $currentDate: { updatedAt: true }
          },
          { new: true }
        );
        
        if (!session) {
          throw new Error(`Session with ID ${sessionId} not found`);
        }
        
        console.log(`Updated session ${sessionId} with recording: ${recordingPath}`);
        
        // Publish an update for the session
        pubsub.publish(SESSION_UPDATED, {
          sessionUpdated: session
        });
        
        return session;
      } catch (error) {
        console.error('Error adding recording to session:', error);
        throw new Error('Failed to update session with recording');
      }
    },

    deleteAllRecordings: async () => {
      try {
        // Update all sessions to remove recordingPath
        const result = await AudioSession.updateMany(
          { recordingPath: { $exists: true, $ne: null } },
          { $unset: { recordingPath: "" } }
        );
        
        console.log(`Removed recording paths from ${result.modifiedCount} sessions`);
        
        return {
          success: true,
          message: `Successfully removed ${result.modifiedCount} recording references from database`,
          count: result.modifiedCount
        };
      } catch (error) {
        console.error('Error removing recording references:', error);
        return {
          success: false,
          message: `Error: ${error.message}`,
          count: 0
        };
      }
    }
  },

  Subscription: {
    effectApplied: {
      subscribe: (_, { sessionId }) => {
        return pubsub.asyncIterator([EFFECT_APPLIED]);
      },
      filter: (payload, variables) => {
        return payload.sessionId === variables.sessionId;
      }
    },
    sessionUpdated: {
      subscribe: (_, { sessionId }) => {
        return pubsub.asyncIterator([SESSION_UPDATED]);
      },
      filter: (payload, variables) => {
        return payload.sessionUpdated.id === variables.sessionId;
      }
    }
  },

  // Field resolvers
  GestureEffect: {
    timestamp: (parent) => parent.timestamp.toISOString()
  },
  AudioSession: {
    startedAt: (parent) => parent.startedAt.toISOString()
  }
};

const clearAllRecordingPaths = async () => {
  try {
    const result = await AudioSession.updateMany(
      {}, 
      { $unset: { recordingPath: "" } }
    );
    
    console.log(`Cleared recording paths for ${result.modifiedCount} sessions`);
    return result.modifiedCount;
  } catch (error) {
    console.error('Error clearing recording paths:', error);
    throw error;
  }
};
