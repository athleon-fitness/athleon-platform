import { useState, useEffect, useCallback, useMemo } from 'react';
import { API } from 'aws-amplify';

/**
 * Custom hook for fetching and filtering athletes
 * Includes memoization for expensive operations
 */
export const useAthletes = (eventId) => {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAthletes = useCallback(async () => {
    if (!eventId) {
      setAthletes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await API.get('CalisthenicsAPI', `/athletes?eventId=${eventId}`);
      setAthletes(response || []);
    } catch (err) {
      console.error('Error fetching athletes:', err);
      setError(err.response?.data?.message || 'Failed to load athletes');
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  return { athletes, loading, error, refresh: fetchAthletes };
};

/**
 * Hook for filtering athletes with memoization
 */
export const useAthleteFilter = (athletes, searchTerm, categoryId) => {
  return useMemo(() => {
    let filtered = athletes;

    // Filter by category
    if (categoryId) {
      filtered = filtered.filter(athlete => athlete.categoryId === categoryId);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(athlete => {
        const fullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
        const email = athlete.email?.toLowerCase() || '';
        const alias = athlete.alias?.toLowerCase() || '';
        
        return fullName.includes(search) || 
               email.includes(search) || 
               alias.includes(search);
      });
    }

    return filtered;
  }, [athletes, searchTerm, categoryId]);
};

/**
 * Utility to normalize athlete ID across different formats
 */
export const getAthleteId = (athlete) => {
  return athlete?.athleteId || athlete?.userId || athlete?.id || null;
};

/**
 * Utility to get athlete display name
 */
export const getAthleteName = (athlete) => {
  if (!athlete) return 'Unknown Athlete';
  
  const firstName = athlete.firstName || '';
  const lastName = athlete.lastName || '';
  const alias = athlete.alias ? ` (${athlete.alias})` : '';
  
  return `${firstName} ${lastName}${alias}`.trim() || 'Unknown Athlete';
};
