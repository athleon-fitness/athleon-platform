import { useState, useEffect, useCallback } from 'react';
import { API } from 'aws-amplify';

/**
 * Custom hook for fetching and managing events
 * Implements caching and prevents duplicate API calls
 */
export const useEvents = (organizationId) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  const fetchEvents = useCallback(async (force = false) => {
    // Check if we have cached data that's still fresh
    if (!force && lastFetch && Date.now() - lastFetch < CACHE_DURATION) {
      return;
    }

    if (!organizationId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await API.get(
        'CalisthenicsAPI',
        `/competitions?organizationId=${organizationId}`
      );

      // Batch fetch additional data for all events at once
      const eventIds = response.map(e => e.eventId);
      
      // Fetch all WODs and athletes in parallel batches
      const [wodsData, athletesData] = await Promise.all([
        fetchBatchWods(eventIds),
        fetchBatchAthletes(eventIds)
      ]);

      // Enrich events with the fetched data
      const enrichedEvents = response.map(event => ({
        ...event,
        wods: wodsData[event.eventId] || [],
        athletes: athletesData[event.eventId] || [],
        wodCount: (wodsData[event.eventId] || []).length,
        athleteCount: (athletesData[event.eventId] || []).length
      }));

      setEvents(enrichedEvents);
      setLastFetch(Date.now());
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.message || 'Failed to load events. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, lastFetch]);

  // Fetch WODs for multiple events in batch
  const fetchBatchWods = async (eventIds) => {
    const wodsMap = {};
    
    // Fetch in parallel but limit concurrency to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(eventId =>
          API.get('CalisthenicsAPI', `/wods?eventId=${eventId}`)
            .then(wods => ({ eventId, wods }))
        )
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          wodsMap[result.value.eventId] = result.value.wods || [];
        }
      });
    }

    return wodsMap;
  };

  // Fetch athletes for multiple events in batch
  const fetchBatchAthletes = async (eventIds) => {
    const athletesMap = {};
    
    const batchSize = 5;
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(eventId =>
          API.get('CalisthenicsAPI', `/athletes?eventId=${eventId}`)
            .then(athletes => ({ eventId, athletes }))
        )
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          athletesMap[result.value.eventId] = result.value.athletes || [];
        }
      });
    }

    return athletesMap;
  };

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    return fetchEvents(true);
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    refresh
  };
};
