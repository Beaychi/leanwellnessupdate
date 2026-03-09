import { useEffect, useCallback } from 'react';

type StorageEventType = 
  | 'waterUpdated' 
  | 'exerciseCompleted' 
  | 'weightUpdated' 
  | 'goalWeightUpdated'
  | 'mealCompleted'
  | 'dataUpdated'
  | 'foodEntryAdded'
  | 'mealPlanUpdated';

/**
 * Hook to listen for storage update events and trigger re-renders
 * @param events - Array of event types to listen for
 * @param callback - Function to call when any of the events fire
 */
export const useStorageSync = (
  events: StorageEventType[],
  callback: () => void
) => {
  useEffect(() => {
    const handleEvent = () => {
      callback();
    };

    // Add listeners for all specified events
    events.forEach(event => {
      window.addEventListener(event, handleEvent);
    });

    return () => {
      // Cleanup listeners
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [events, callback]);
};

/**
 * Dispatch a custom storage event to notify all listeners
 * @param eventType - The type of event to dispatch
 */
export const dispatchStorageEvent = (eventType: StorageEventType) => {
  window.dispatchEvent(new CustomEvent(eventType));
};
