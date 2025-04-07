import { gql } from '@apollo/client';

export const START_SESSION = gql`
  mutation StartSession {
    startSession {
      id
      userId
      isActive
      startedAt
    }
  }
`;

export const END_SESSION = gql`
  mutation EndSession($sessionId: ID!) {
    endSession(sessionId: $sessionId)
  }
`;

export const APPLY_GESTURE_EFFECT = gql`
  mutation ApplyGestureEffect($sessionId: ID!, $type: String!, $parameters: JSON!) {
    applyGestureEffect(
      sessionId: $sessionId
      type: $type
      parameters: $parameters
    ) {
      id
      type
      parameters
      timestamp
    }
  }
`;

export const EFFECT_APPLIED_SUBSCRIPTION = gql`
  subscription EffectApplied($sessionId: ID!) {
    effectApplied(sessionId: $sessionId) {
      id
      type
      parameters
      timestamp
    }
  }
`;

export const GET_RECENT_SESSIONS = gql`
  query GetRecentSessions($limit: Int) {
    recentSessions(limit: $limit) {
      id
      startedAt
      endedAt
      isActive
    }
  }
`;

export const GET_USER_SESSIONS = gql`
  query GetUserSessions($userId: String!) {
    getUserSessions(userId: $userId) {
      id
      startedAt
      isActive
      recordingPath
      currentEffects {
        id
        type
      }
    }
  }
`;