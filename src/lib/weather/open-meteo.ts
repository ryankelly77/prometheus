/**
 * Open-Meteo Weather API Client
 *
 * Fetches historical and forecast weather data from Open-Meteo (free, no API key needed).
 * Used for weather-aware restaurant insights and sales correlation analysis.
 *
 * @see https://open-meteo.com/en/docs
 */

// =============================================================================
// Types
// =============================================================================

export interface DailyWeather {
  date: string;
  tempHigh: number;
  tempLow: number;
  tempMean: number;
  precipitationInches: number;
  precipitationHours: number;
  rainInches: number;
  snowfallInches: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeedMaxMph: number;
  isRainy: boolean;
  isExtremeHeat: boolean;
  isExtremeCold: boolean;
  isSevereWeather: boolean;
}

interface OpenMeteoHistoricalResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  daily_units: {
    time: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    temperature_2m_mean: string;
    precipitation_sum: string;
    precipitation_hours: string;
    rain_sum: string;
    snowfall_sum: string;
    weather_code: string;
    wind_speed_10m_max: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    temperature_2m_mean: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_hours: (number | null)[];
    rain_sum: (number | null)[];
    snowfall_sum: (number | null)[];
    weather_code: (number | null)[];
    wind_speed_10m_max: (number | null)[];
  };
}

interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  daily_units: {
    time: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    temperature_2m_mean: string;
    precipitation_sum: string;
    precipitation_probability_max: string;
    precipitation_hours: string;
    rain_sum: string;
    snowfall_sum: string;
    weather_code: string;
    wind_speed_10m_max: string;
  };
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    temperature_2m_mean: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max: (number | null)[];
    precipitation_hours: (number | null)[];
    rain_sum: (number | null)[];
    snowfall_sum: (number | null)[];
    weather_code: (number | null)[];
    wind_speed_10m_max: (number | null)[];
  };
}

// =============================================================================
// WMO Weather Code Mapping
// =============================================================================

const weatherCodeDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// Severe weather codes: heavy rain, freezing rain, heavy snow, violent showers, thunderstorms
const SEVERE_WEATHER_CODES = new Set([65, 66, 67, 75, 82, 86, 95, 96, 99]);

// =============================================================================
// Helper Functions
// =============================================================================

function getWeatherDescription(code: number | null): string {
  if (code === null) return "Unknown";
  return weatherCodeDescriptions[code] || "Unknown";
}

function calculateDerivedFlags(
  precipitationInches: number,
  tempHigh: number,
  tempLow: number,
  weatherCode: number | null
): {
  isRainy: boolean;
  isExtremeHeat: boolean;
  isExtremeCold: boolean;
  isSevereWeather: boolean;
} {
  return {
    isRainy: precipitationInches > 0.1,
    isExtremeHeat: tempHigh > 95,
    isExtremeCold: tempLow < 32,
    isSevereWeather: weatherCode !== null && SEVERE_WEATHER_CODES.has(weatherCode),
  };
}

function parseHistoricalResponse(data: OpenMeteoHistoricalResponse): DailyWeather[] {
  const { daily } = data;
  const results: DailyWeather[] = [];

  for (let i = 0; i < daily.time.length; i++) {
    const tempHigh = daily.temperature_2m_max[i] ?? 0;
    const tempLow = daily.temperature_2m_min[i] ?? 0;
    const tempMean = daily.temperature_2m_mean[i] ?? 0;
    const precipitationInches = daily.precipitation_sum[i] ?? 0;
    const precipitationHours = daily.precipitation_hours[i] ?? 0;
    const rainInches = daily.rain_sum[i] ?? 0;
    const snowfallInches = daily.snowfall_sum[i] ?? 0;
    const weatherCode = daily.weather_code[i];
    const windSpeedMaxMph = daily.wind_speed_10m_max[i] ?? 0;

    const flags = calculateDerivedFlags(precipitationInches, tempHigh, tempLow, weatherCode);

    results.push({
      date: daily.time[i],
      tempHigh,
      tempLow,
      tempMean,
      precipitationInches,
      precipitationHours,
      rainInches,
      snowfallInches,
      weatherCode: weatherCode ?? 0,
      weatherDescription: getWeatherDescription(weatherCode),
      windSpeedMaxMph,
      ...flags,
    });
  }

  return results;
}

function parseForecastResponse(data: OpenMeteoForecastResponse): DailyWeather[] {
  const { daily } = data;
  const results: DailyWeather[] = [];

  for (let i = 0; i < daily.time.length; i++) {
    const tempHigh = daily.temperature_2m_max[i] ?? 0;
    const tempLow = daily.temperature_2m_min[i] ?? 0;
    const tempMean = daily.temperature_2m_mean[i] ?? 0;
    const precipitationInches = daily.precipitation_sum[i] ?? 0;
    const precipitationHours = daily.precipitation_hours[i] ?? 0;
    const rainInches = daily.rain_sum[i] ?? 0;
    const snowfallInches = daily.snowfall_sum[i] ?? 0;
    const weatherCode = daily.weather_code[i];
    const windSpeedMaxMph = daily.wind_speed_10m_max[i] ?? 0;

    const flags = calculateDerivedFlags(precipitationInches, tempHigh, tempLow, weatherCode);

    results.push({
      date: daily.time[i],
      tempHigh,
      tempLow,
      tempMean,
      precipitationInches,
      precipitationHours,
      rainInches,
      snowfallInches,
      weatherCode: weatherCode ?? 0,
      weatherDescription: getWeatherDescription(weatherCode),
      windSpeedMaxMph,
      ...flags,
    });
  }

  return results;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch historical weather data from Open-Meteo Archive API
 *
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param timezone - IANA timezone (default: America/Chicago)
 * @returns Array of daily weather data
 */
export async function fetchHistoricalWeather(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string,
  timezone: string = "America/Chicago"
): Promise<DailyWeather[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    start_date: startDate,
    end_date: endDate,
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "temperature_2m_mean",
      "precipitation_sum",
      "precipitation_hours",
      "rain_sum",
      "snowfall_sum",
      "weather_code",
      "wind_speed_10m_max",
    ].join(","),
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    wind_speed_unit: "mph",
    timezone,
  });

  const url = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;

  console.log(`[Open-Meteo] Fetching historical weather: ${startDate} to ${endDate}`);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Open-Meteo] Historical API error: ${response.status}`, errorText);
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenMeteoHistoricalResponse = await response.json();

  const results = parseHistoricalResponse(data);
  console.log(`[Open-Meteo] Fetched ${results.length} days of historical weather`);

  return results;
}

/**
 * Fetch weather forecast from Open-Meteo Forecast API
 *
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @param forecastDays - Number of days to forecast (default: 7, max: 16)
 * @param timezone - IANA timezone (default: America/Chicago)
 * @returns Array of daily weather forecast data
 */
export async function fetchForecast(
  lat: number,
  lng: number,
  forecastDays: number = 7,
  timezone: string = "America/Chicago"
): Promise<DailyWeather[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "temperature_2m_mean",
      "precipitation_sum",
      "precipitation_probability_max",
      "precipitation_hours",
      "rain_sum",
      "snowfall_sum",
      "weather_code",
      "wind_speed_10m_max",
    ].join(","),
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    wind_speed_unit: "mph",
    timezone,
    forecast_days: forecastDays.toString(),
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  console.log(`[Open-Meteo] Fetching ${forecastDays}-day forecast`);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Open-Meteo] Forecast API error: ${response.status}`, errorText);
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenMeteoForecastResponse = await response.json();

  const results = parseForecastResponse(data);
  console.log(`[Open-Meteo] Fetched ${results.length} days of forecast`);

  return results;
}

/**
 * Map a WMO weather code to the Prisma WeatherCondition enum
 */
export function mapWeatherCodeToCondition(code: number): string {
  // Map WMO codes to our WeatherCondition enum values
  const mapping: Record<number, string> = {
    0: "CLEAR",
    1: "MOSTLY_CLEAR",
    2: "PARTLY_CLOUDY",
    3: "OVERCAST",
    45: "FOGGY",
    48: "FOGGY",
    51: "LIGHT_DRIZZLE",
    53: "DRIZZLE",
    55: "HEAVY_DRIZZLE",
    56: "LIGHT_DRIZZLE",
    57: "HEAVY_DRIZZLE",
    61: "LIGHT_RAIN",
    63: "RAIN",
    65: "HEAVY_RAIN",
    66: "SLEET",
    67: "SLEET",
    71: "LIGHT_SNOW",
    73: "SNOW",
    75: "HEAVY_SNOW",
    77: "SNOW",
    80: "LIGHT_RAIN",
    81: "RAIN",
    82: "HEAVY_RAIN",
    85: "LIGHT_SNOW",
    86: "HEAVY_SNOW",
    95: "THUNDERSTORM",
    96: "THUNDERSTORM_HAIL",
    99: "THUNDERSTORM_HAIL",
  };

  return mapping[code] || "CLEAR";
}

/**
 * Get the weather code description for display
 */
export function getWeatherCodeDescription(code: number): string {
  return weatherCodeDescriptions[code] || "Unknown";
}

/**
 * Check if a weather code represents severe weather
 */
export function isSevereWeatherCode(code: number): boolean {
  return SEVERE_WEATHER_CODES.has(code);
}
