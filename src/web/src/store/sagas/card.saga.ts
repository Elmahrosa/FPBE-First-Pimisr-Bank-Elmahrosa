import { 
  call, 
  put, 
  takeLatest, 
  select, 
  delay, 
  race, 
  take 
} from 'redux-saga/effects';
import { logger } from '@monitoring/logger';
import { metrics } from '@monitoring/metrics';
import { CustomError } from '@fpbe/error-handling';
import { 
  Card, 
  CardControls, 
  CardStatus 
} from '../../types/card.types';
import { 
  cardActions,
  fetchCards,
  createCard,
  updateCardControls,
  updateCardStatus
} from '../actions/card.actions';

// Constants for saga configuration
const FETCH_TIMEOUT = 5000;
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100;

/**
 * Rate limiting implementation for card operations
 */
function* rateLimit(key: string) {
  const now = Date.now();
  const requests = yield select(state => state.cards.rateLimit[key] || []);
  const validRequests = requests.filter(time => time > now - RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= MAX_REQUESTS) {
    throw new CustomError('RATE_LIMIT_EXCEEDED', 'Too many requests');
  }
  
  yield put(cardActions.updateRateLimit({ key, timestamp: now }));
}

/**
 * Error boundary wrapper for saga handlers
 */
function* withErrorBoundary(saga: any, ...args: any[]) {
  try {
    yield call(saga, ...args);
  } catch (error: any) {
    logger.error('Card saga error', { 
      saga: saga.name,
      error: error.message,
      context: args 
    });
    
    yield put(cardActions.setError({
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message
    }));
    
    metrics.increment('card.operation.error', {
      operation: saga.name,
      errorCode: error.code
    });
  }
}

/**
 * Saga handler for fetching virtual cards
 */
function* handleFetchCards(action: ReturnType<typeof fetchCards.request>) {
  yield call(rateLimit, 'fetchCards');
  
  metrics.startTimer('card.fetch.duration');
  
  const { timeout, response } = yield race({
    response: call(fetchCards, action.payload),
    timeout: delay(FETCH_TIMEOUT)
  });
  
  if (timeout) {
    throw new CustomError('FETCH_TIMEOUT', 'Operation timed out');
  }
  
  metrics.stopTimer('card.fetch.duration');
  
  yield put(cardActions.fetchCards.success(response));
  
  logger.info('Cards fetched successfully', {
    count: response.cards.length,
    duration: metrics.getTimer('card.fetch.duration')
  });
}

/**
 * Saga handler for creating virtual cards
 */
function* handleCreateCard(action: ReturnType<typeof createCard.request>) {
  yield call(rateLimit, 'createCard');
  
  metrics.startTimer('card.create.duration');
  
  for (let i = 0; i < RETRY_COUNT; i++) {
    try {
      const response = yield call(createCard, action.payload);
      
      metrics.stopTimer('card.create.duration');
      metrics.increment('card.created');
      
      yield put(cardActions.createCard.success(response));
      
      logger.audit('Virtual card created', {
        cardId: response.id,
        type: action.payload.type
      });
      
      return;
    } catch (error) {
      if (i === RETRY_COUNT - 1) throw error;
      yield delay(RETRY_DELAY * Math.pow(2, i));
    }
  }
}

/**
 * Saga handler for updating card controls
 */
function* handleUpdateCardControls(action: ReturnType<typeof updateCardControls.request>) {
  yield call(rateLimit, 'updateControls');
  
  const { cardId, controls } = action.payload;
  
  // Validate control settings
  if (!isValidControlSettings(controls)) {
    throw new CustomError('INVALID_CONTROLS', 'Invalid control settings');
  }
  
  metrics.startTimer('card.controls.update.duration');
  
  const response = yield call(updateCardControls, action.payload);
  
  metrics.stopTimer('card.controls.update.duration');
  
  yield put(cardActions.updateCardControls.success(response));
  
  logger.audit('Card controls updated', {
    cardId,
    controls: controls
  });
}

/**
 * Saga handler for updating card status
 */
function* handleUpdateCardStatus(action: ReturnType<typeof updateCardStatus.request>) {
  yield call(rateLimit, 'updateStatus');
  
  const { cardId, status } = action.payload;
  
  metrics.startTimer('card.status.update.duration');
  
  const response = yield call(updateCardStatus, action.payload);
  
  metrics.stopTimer('card.status.update.duration');
  
  yield put(cardActions.updateCardStatus.success(response));
  
  logger.audit('Card status updated', {
    cardId,
    newStatus: status
  });
}

/**
 * Helper function to validate card control settings
 */
function isValidControlSettings(controls: CardControls): boolean {
  return (
    controls.transactionLimits.daily > 0 &&
    controls.transactionLimits.monthly > 0 &&
    controls.transactionLimits.monthly >= controls.transactionLimits.daily
  );
}

/**
 * Root saga combining all card management features
 */
export default function* cardSaga() {
  yield takeLatest(cardActions.fetchCards.request, withErrorBoundary, handleFetchCards);
  yield takeLatest(cardActions.createCard.request, withErrorBoundary, handleCreateCard);
  yield takeLatest(cardActions.updateCardControls.request, withErrorBoundary, handleUpdateCardControls);
  yield takeLatest(cardActions.updateCardStatus.request, withErrorBoundary, handleUpdateCardStatus);
}