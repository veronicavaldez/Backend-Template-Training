import { gql } from '@apollo/client';

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