// UK Police API Service
// API Documentation: https://data.police.uk/docs/

export interface PoliceCrime {
  id: number;
  category: string;
  location_type: string;
  location: {
    latitude: string;
    longitude: string;
    street: {
      id: number;
      name: string;
    };
  };
  context: string;
  outcome_status: {
    category: string;
    date: string;
  } | null;
  persistent_id: string;
  location_subtype: string;
  month: string;
}

export interface CrimeData {
  id: string;
  category: string;
  lat: number;
  lng: number;
  street: string;
  month: string;
  outcomeStatus: string | null;
}

// Map Police API categories to simpler display categories
export const CRIME_CATEGORY_MAPPING: Record<string, string> = {
  'anti-social-behaviour': 'Anti-social behaviour',
  'bicycle-theft': 'Bicycle theft',
  'burglary': 'Burglary',
  'criminal-damage-arson': 'Criminal damage',
  'drugs': 'Drugs',
  'other-theft': 'Other theft',
  'possession-of-weapons': 'Weapons',
  'public-order': 'Public order',
  'robbery': 'Robbery',
  'shoplifting': 'Shoplifting',
  'theft-from-the-person': 'Theft from person',
  'vehicle-crime': 'Vehicle crime',
  'violent-crime': 'Violent crime',
  'other-crime': 'Other crime',
};

// Color mapping for different crime categories
export const CRIME_CATEGORY_COLORS: Record<string, string> = {
  'theft-from-the-person': '#FF0000', // Red - most relevant for phone theft
  'robbery': '#FF3300', // Red-orange
  'other-theft': '#FF6600', // Orange
  'violent-crime': '#CC0000', // Dark red
  'burglary': '#FF9900', // Amber
  'vehicle-crime': '#FFCC00', // Yellow
  'anti-social-behaviour': '#9966FF', // Purple
  'criminal-damage-arson': '#FF6699', // Pink
  'drugs': '#669900', // Green
  'public-order': '#3399FF', // Blue
  'shoplifting': '#FF9966', // Light orange
  'bicycle-theft': '#66CCCC', // Teal
  'possession-of-weapons': '#990000', // Dark red
  'other-crime': '#999999', // Gray
};

/**
 * Fetch street-level crimes from UK Police API
 * @param lat Latitude of the center point
 * @param lng Longitude of the center point
 * @param date Optional date in YYYY-MM format (defaults to latest available)
 */
export async function fetchCrimeData(
  lat: number,
  lng: number,
  date?: string
): Promise<CrimeData[]> {
  console.log('=== fetchCrimeData CALLED ===');
  console.log('Parameters:', { lat, lng, date });

  try {
    // Build the API URL
    const baseUrl = 'https://data.police.uk/api/crimes-street/all-crime';
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
    });

    if (date) {
      params.append('date', date);
    }

    const url = `${baseUrl}?${params.toString()}`;
    console.log('=== MAKING FETCH REQUEST ===');
    console.log('URL:', url);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('=== FETCH RESPONSE RECEIVED ===');
    console.log('Status:', response.status, response.statusText);
    console.log('OK:', response.ok);

    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('Police API is temporarily unavailable. Please try again later.');
      }
      if (response.status === 404) {
        throw new Error('No crime data available for this location.');
      }
      if (response.status === 403) {
        throw new Error('Police API access denied. This may be due to rate limiting or geo-restrictions.');
      }
      throw new Error(`Police API error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    // Check if response is valid JSON
    if (text === 'Access denied' || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('Police API access denied. The API may be temporarily unavailable.');
    }

    let data: PoliceCrime[];
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Police API response:', text.substring(0, 200));
      throw new Error('Invalid response from Police API. Please try again later.');
    }

    console.log(`Fetched ${data.length} crime records`);

    // Transform the data to our format
    const crimes: CrimeData[] = data.map((crime) => ({
      id: crime.persistent_id || `${crime.id}`,
      category: crime.category,
      lat: parseFloat(crime.location.latitude),
      lng: parseFloat(crime.location.longitude),
      street: crime.location.street.name,
      month: crime.month,
      outcomeStatus: crime.outcome_status?.category || null,
    }));

    return crimes;
  } catch (error) {
    console.error('Error fetching crime data:', error);
    throw error;
  }
}

/**
 * Get the latest available date for crime data
 * Police data is typically 1-2 months behind current date
 */
export async function getLatestCrimeDate(): Promise<string> {
  try {
    const response = await fetch('https://data.police.uk/api/crime-last-updated');

    if (!response.ok) {
      throw new Error('Failed to get latest crime data date');
    }

    const data = await response.json();
    console.log('Latest crime data date:', data.date);
    return data.date;
  } catch (error) {
    console.error('Error getting latest date:', error);
    // Fallback to 2 months ago
    const date = new Date();
    date.setMonth(date.getMonth() - 2);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Fetch crime data for multiple points (for larger area coverage)
 */
export async function fetchCrimeDataForArea(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 1
): Promise<CrimeData[]> {
  const crimes: CrimeData[] = [];
  const seenIds = new Set<string>();

  try {
    // Fetch from center point
    const centerCrimes = await fetchCrimeData(centerLat, centerLng);

    centerCrimes.forEach((crime) => {
      if (!seenIds.has(crime.id)) {
        seenIds.add(crime.id);
        crimes.push(crime);
      }
    });

    console.log(`Total unique crimes fetched: ${crimes.length}`);
    return crimes;
  } catch (error) {
    console.error('Error fetching crime data for area:', error);
    throw error;
  }
}
