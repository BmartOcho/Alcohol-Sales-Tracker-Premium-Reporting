// Freemium tracking utility for localStorage-based search limits

const SEARCH_COUNT_KEY = 'freemium_search_count';
const SEARCH_HISTORY_KEY = 'freemium_search_history';
const LAST_RESET_KEY = 'freemium_last_reset';
const MAX_FREE_SEARCHES = 3;

interface SearchData {
  count: number;
  searches: string[]; // Store normalized search queries to prevent duplicates
  lastReset: string; // ISO date string
}

/**
 * Get the start of today (midnight)
 */
function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Check if we need to reset the counter (new day)
 */
function shouldReset(lastResetStr: string): boolean {
  if (!lastResetStr) return true;
  
  const lastReset = new Date(lastResetStr);
  const todayStart = getTodayStart();
  
  return lastReset < todayStart;
}

/**
 * Get current search data from localStorage
 */
function getSearchData(): SearchData {
  try {
    const countStr = localStorage.getItem(SEARCH_COUNT_KEY);
    const historyStr = localStorage.getItem(SEARCH_HISTORY_KEY);
    const lastResetStr = localStorage.getItem(LAST_RESET_KEY);
    
    // Check if we need to reset (new day)
    if (shouldReset(lastResetStr || '')) {
      resetSearches();
      return {
        count: 0,
        searches: [],
        lastReset: new Date().toISOString()
      };
    }
    
    return {
      count: parseInt(countStr || '0', 10),
      searches: historyStr ? JSON.parse(historyStr) : [],
      lastReset: lastResetStr || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error reading search data:', error);
    return {
      count: 0,
      searches: [],
      lastReset: new Date().toISOString()
    };
  }
}

/**
 * Save search data to localStorage
 */
function saveSearchData(data: SearchData): void {
  try {
    localStorage.setItem(SEARCH_COUNT_KEY, data.count.toString());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(data.searches));
    localStorage.setItem(LAST_RESET_KEY, data.lastReset);
  } catch (error) {
    console.error('Error saving search data:', error);
  }
}

/**
 * Normalize search query for duplicate detection
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

/**
 * Record a new search (only if it's a unique query)
 * Returns true if the search was counted, false if it was a duplicate
 */
export function recordSearch(query: string): boolean {
  const data = getSearchData();
  const normalizedQuery = normalizeQuery(query);
  
  // Don't count empty searches
  if (!normalizedQuery) return false;
  
  // Don't count if already searched this query today
  if (data.searches.includes(normalizedQuery)) {
    return false;
  }
  
  // Add to history and increment count
  data.searches.push(normalizedQuery);
  data.count += 1;
  
  saveSearchData(data);
  return true;
}

/**
 * Get remaining free searches
 */
export function getRemainingSearches(): number {
  const data = getSearchData();
  return Math.max(0, MAX_FREE_SEARCHES - data.count);
}

/**
 * Check if paywall should be shown (3+ searches used)
 */
export function shouldShowPaywall(): boolean {
  const data = getSearchData();
  return data.count >= MAX_FREE_SEARCHES;
}

/**
 * Get current search count
 */
export function getSearchCount(): number {
  const data = getSearchData();
  return data.count;
}

/**
 * Reset search counter (for testing or manual reset)
 */
export function resetSearches(): void {
  localStorage.removeItem(SEARCH_COUNT_KEY);
  localStorage.removeItem(SEARCH_HISTORY_KEY);
  localStorage.removeItem(LAST_RESET_KEY);
}

/**
 * Check if a specific query has been searched today
 */
export function hasSearched(query: string): boolean {
  const data = getSearchData();
  return data.searches.includes(normalizeQuery(query));
}
