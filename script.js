/**
 * Weather App Configuration
 * @type {Object}
 */
const CONFIG = {
  API_KEY: '8c9fcb59533019ce4dcd77270c36d35a',
  FORECAST_INTERVAL: 8,
  MAX_RECENT_SEARCHES: 5,
  DEFAULT_CITY: 'London',
  RETRY_DELAY: 2000,
  MAX_RETRIES: 3,
  SIMILAR_CITIES: ['London', 'New York', 'Tokyo', 'Paris', 'Berlin', 'Sydney', 'Rome', 'Moscow', 'Dubai', 'Singapore']
};

/**
 * Error Messages Configuration
 * @type {Object}
 */
const ERROR_MESSAGES = {
  CITY_NOT_FOUND: "City not found. Please check the spelling.",
  NETWORK_ERROR: "Network error. Check your connection.",
  API_LIMIT: "Too many requests. Please wait a minute.",
  GEOLOCATION_ERROR: "Location access denied. Search manually.",
  INVALID_INPUT: "Please enter a valid city name.",
  OFFLINE: "You're offline. Connect to the internet.",
  INVALID_RESPONSE: "Received invalid weather data. Please try again.",
  DEFAULT: "Weather data unavailable. Try again later."
};

/**
 * DOM Elements
 * @type {Object}
 */
const elements = {
  cityInput: document.getElementById('cityInput'),
  submitBtn: document.getElementById('submitBtn'),
  locationBtn: document.getElementById('locationBtn'),
  unitToggle: document.getElementById('unitToggle'),
  cityName: document.getElementById('cityName'),
  temperature: document.getElementById('temperature'),
  description: document.getElementById('description'),
  weatherIcon: document.getElementById('weatherIcon'),
  forecast: document.getElementById('forecast'),
  humidity: document.getElementById('humidity'),
  wind: document.getElementById('wind'),
  currentDate: document.getElementById('currentDate'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  errorMessage: document.getElementById('errorMessage'),
  recentList: document.getElementById('recentList')
};

/**
 * Application State
 * @type {Object}
 */
let state = {
  unit: 'celsius',
  recentSearches: JSON.parse(localStorage.getItem('recentSearches')) || [],
  retryCount: 0,
  isOnline: navigator.onLine
};

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

/**
 * Initializes the application
 * @returns {void}
 */
function initApp() {
  verifyResources();
  updateRecentSearches();
  getWeather(CONFIG.DEFAULT_CITY);
  loadCachedWeather();
  
  // Event listeners
  elements.cityInput.addEventListener('keyup', (e) => e.key === 'Enter' && handleSearch());
  elements.submitBtn.addEventListener('click', handleSearch);
  elements.locationBtn.addEventListener('click', handleLocation);
  elements.unitToggle.addEventListener('click', toggleUnits);
}

/**
 * Verifies required resources are available
 * @returns {void}
 */
function verifyResources() {
  const img = new Image();
  img.src = './images/default.png';
  img.onerror = () => console.error("Default background image is missing");

  const icon = new Image();
  icon.src = './icons/default.svg';
  icon.onerror = () => console.error("Default icon is missing");
}

/**
 * Updates online status and handles UI accordingly
 * @returns {void}
 */
function updateOnlineStatus() {
  state.isOnline = navigator.onLine;
  if (!state.isOnline) {
    showError(ERROR_MESSAGES.OFFLINE, true);
    loadCachedWeather();
  } else {
    hideError();
    const currentCity = elements.cityName.textContent.split(',')[0].trim();
    if (currentCity) getWeather(currentCity);
  }
}

/**
 * Loads cached weather data from localStorage
 * @returns {void}
 */
function loadCachedWeather() {
  const cachedWeather = localStorage.getItem('cachedWeather');
  if (cachedWeather) {
    try {
      const parsedData = JSON.parse(cachedWeather);
      if (isValidWeatherData(parsedData)) {
        updateUI(parsedData, true);
      }
    } catch (e) {
      console.error("Error parsing cached data:", e);
    }
  }
}

/**
 * Handles city search
 * @returns {Promise<void>}
 */
async function handleSearch() {
  const city = elements.cityInput.value.trim();
  
  if (!validateCityName(city)) {
    showError(ERROR_MESSAGES.INVALID_INPUT);
    return;
  }
  
  if (!state.isOnline) {
    showError(ERROR_MESSAGES.OFFLINE, true);
    return;
  }
  
  await getWeather(city);
  addRecentSearch(city);
}

/**
 * Handles geolocation request
 * @returns {Promise<void>}
 */
async function handleLocation() {
  if (!state.isOnline) {
    showError(ERROR_MESSAGES.OFFLINE, true);
    return;
  }

  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser");
    return;
  }

  try {
    showLoading();
    const position = await getCurrentPositionWithTimeout(10000);
    const { latitude, longitude } = position.coords;
    await getWeatherByCoords(latitude, longitude);
  } catch (error) {
    console.error("Geolocation error:", error);
    showError(ERROR_MESSAGES.GEOLOCATION_ERROR);
  } finally {
    hideLoading();
  }
}

/**
 * Gets current position with timeout
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<GeolocationPosition>}
 */
function getCurrentPositionWithTimeout(timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Geolocation timeout')),
      timeout
    );
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      { timeout: timeout - 500 }
    );
  });
}

/**
 * Gets weather by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<void>}
 */
async function getWeatherByCoords(lat, lon) {
  try {
    const response = await fetchWithRetry(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.API_KEY}`
    );
    const data = await parseResponse(response);
    updateUI(data);
    addRecentSearch(data.city.name);
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Fetches data with retry logic
 * @param {string} url - API endpoint
 * @param {number} retries - Maximum retry attempts
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, retries = CONFIG.MAX_RETRIES) {
  try {
    if (!state.isOnline) {
      throw new Error('OFFLINE');
    }
    
    const response = await fetch(url);
    
    if (response.status === 429) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
        return fetchWithRetry(url, retries - 1);
      }
      throw new Error('API_LIMIT');
    }
    
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'CITY_NOT_FOUND' : 'NETWORK_ERROR');
    }
    
    return response;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('NETWORK_ERROR');
    }
    throw error;
  }
}

/**
 * Parses API response
 * @param {Response} response - API response
 * @returns {Promise<Object>}
 */
async function parseResponse(response) {
  const data = await response.json();
  
  if (!isValidWeatherData(data)) {
    throw new Error('INVALID_RESPONSE');
  }
  
  return data;
}

/**
 * Validates weather data structure
 * @param {Object} data - Weather data
 * @returns {boolean}
 */
function isValidWeatherData(data) {
  return data && 
         data.city && 
         data.list && 
         data.list.length > 0 && 
         data.list[0].weather && 
         data.list[0].weather.length > 0;
}

/**
 * Gets weather data for a city
 * @param {string} city - City name
 * @returns {Promise<void>}
 */
async function getWeather(city) {
  try {
    showLoading();
    hideError();
    
    if (!state.isOnline) {
      throw new Error('OFFLINE');
    }
    
    const response = await fetchWithRetry(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${CONFIG.API_KEY}`
    );
    
    const data = await parseResponse(response);
    updateUI(data);
    cacheWeatherData(data);
    elements.cityInput.value = '';
    state.retryCount = 0;
  } catch (error) {
    handleApiError(error);
  } finally {
    hideLoading();
  }
}

/**
 * Caches weather data to localStorage
 * @param {Object} data - Weather data
 * @returns {void}
 */
function cacheWeatherData(data) {
  try {
    data.timestamp = new Date().toISOString();
    localStorage.setItem('cachedWeather', JSON.stringify(data));
  } catch (e) {
    console.error("Error caching weather data:", e);
  }
}

/**
 * Handles API errors
 * @param {Error} error - Error object
 * @returns {void}
 */
function handleApiError(error) {
  console.error("API Error:", error);
  
  let message;
  if (error.message === 'CITY_NOT_FOUND') {
    const similar = findSimilarCity(elements.cityInput.value.trim());
    message = similar 
      ? `${ERROR_MESSAGES.CITY_NOT_FOUND} Did you mean ${similar}?`
      : ERROR_MESSAGES.CITY_NOT_FOUND;
  } else if (error.message === 'INVALID_RESPONSE') {
    message = `${ERROR_MESSAGES.INVALID_RESPONSE} (Invalid data structure from API)`;
  } else {
    message = ERROR_MESSAGES[error.message] || ERROR_MESSAGES.DEFAULT;
  }
  
  showError(message);
  loadCachedWeather();
}

/**
 * Finds similar city names
 * @param {string} inputCity - City name to match
 * @returns {string|null}
 */
function findSimilarCity(inputCity) {
  if (!inputCity || inputCity.length < 2) return null;
  
  const lowerInput = inputCity.toLowerCase();
  return CONFIG.SIMILAR_CITIES.find(city => 
    city.toLowerCase().startsWith(lowerInput.substring(0, 3))
  );
}

/**
 * Updates the UI with weather data
 * @param {Object} data - Weather data
 * @param {boolean} [isCached=false] - Whether data is from cache
 * @returns {void}
 */
function updateUI(data, isCached = false) {
  if (!isValidWeatherData(data)) {
    showError(ERROR_MESSAGES.INVALID_RESPONSE);
    return;
  }

  updateCurrentWeather(data, isCached);
  updateBackground(data.list[0].weather[0].main.toLowerCase());
  updateForecast(data);

  if (isCached) {
    const cachedTime = data.timestamp ? new Date(data.timestamp).toLocaleString() : 'previously';
    showError(`Showing cached data from ${cachedTime}. ${ERROR_MESSAGES.NETWORK_ERROR}`, true);
  } else {
    hideError();
  }
}

/**
 * Updates current weather section
 * @param {Object} data - Weather data
 * @param {boolean} isCached - Whether data is from cache
 * @returns {void}
 */
function updateCurrentWeather(data, isCached) {
  const current = data.list[0];
  const condition = current.weather[0].main.toLowerCase();
  const cachedBadge = isCached ? '<span class="cached-badge"> (Cached)</span>' : '';
  
  elements.cityName.innerHTML = `${data.city.name}, ${data.city.country}${cachedBadge}`;
  elements.currentDate.textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const temp = convertTemp(current.main.temp, state.unit);
  elements.temperature.textContent = `${temp}°${state.unit === 'celsius' ? 'C' : 'F'}`;
  elements.description.textContent = current.weather[0].description;
  elements.weatherIcon.innerHTML = getWeatherIcon(condition);
  elements.humidity.textContent = current.main.humidity;
  elements.wind.textContent = Math.round(current.wind.speed * 3.6);
}

/**
 * Updates forecast section
 * @param {Object} data - Weather data
 * @returns {void}
 */
function updateForecast(data) {
  elements.forecast.innerHTML = '';
  const unitSymbol = state.unit === 'celsius' ? 'C' : 'F';

  for (let i = CONFIG.FORECAST_INTERVAL; i <= CONFIG.FORECAST_INTERVAL * 5; i += CONFIG.FORECAST_INTERVAL) {
    if (!data.list[i]) continue;
    
    const day = data.list[i];
    if (!day.weather || day.weather.length === 0) continue;
    
    const weather = day.weather[0].main.toLowerCase();
    
    elements.forecast.innerHTML += `
      <div class="forecast-day">
        <p>${new Date(day.dt_txt).toLocaleDateString('en-US', { weekday: 'short' })}</p>
        ${getWeatherIcon(weather)}
        <p>H: ${convertTemp(day.main.temp_max, state.unit)}°${unitSymbol}</p>
        <p>L: ${convertTemp(day.main.temp_min, state.unit)}°${unitSymbol}</p>
      </div>
    `;
  }
}

/**
 * Updates background based on weather condition
 * @param {string} condition - Weather condition
 * @returns {void}
 */
function updateBackground(condition) {
  const validConditions = ['clear', 'clouds', 'rain', 'drizzle', 'thunderstorm', 'snow', 'mist', 'fog', 'haze'];
  const bgCondition = validConditions.includes(condition) ? condition : 'default';
  
  const img = new Image();
  img.src = `./images/${bgCondition}.png`;
  
  img.onerror = () => {
    document.body.style.backgroundImage = 'url("./images/default.png")';
  };
  
  img.onload = () => {
    document.body.style.backgroundImage = `url('./images/${bgCondition}.png')`;
  };
}

/**
 * Converts temperature between units
 * @param {number} temp - Temperature value
 * @param {string} unit - Target unit ('celsius' or 'fahrenheit')
 * @returns {number}
 */
function convertTemp(temp, unit) {
  return unit === 'celsius' 
    ? Math.round(temp) 
    : Math.round((temp * 9/5) + 32);
}

/**
 * Validates city name input
 * @param {string} city - City name
 * @returns {boolean}
 */
function validateCityName(city) {
  return city && /^[a-zA-Z\u0080-\u024F\s\/\-()']+$/.test(city);
}

/**
 * Toggles temperature units
 * @returns {void}
 */
function toggleUnits() {
  state.unit = state.unit === 'celsius' ? 'fahrenheit' : 'celsius';
  elements.unitToggle.textContent = state.unit === 'celsius' ? 'Switch to °F' : 'Switch to °C';
  const currentCity = elements.cityName.textContent.split(',')[0].trim();
  if (currentCity) getWeather(currentCity);
}

/**
 * Adds city to recent searches
 * @param {string} city - City name
 * @returns {void}
 */
function addRecentSearch(city) {
  state.recentSearches = state.recentSearches.filter(item => 
    item.toLowerCase() !== city.toLowerCase()
  );
  state.recentSearches.unshift(city);
  state.recentSearches = state.recentSearches.slice(0, CONFIG.MAX_RECENT_SEARCHES);
  localStorage.setItem('recentSearches', JSON.stringify(state.recentSearches));
  updateRecentSearches();
}

/**
 * Updates recent searches list
 * @returns {void}
 */
function updateRecentSearches() {
  elements.recentList.innerHTML = state.recentSearches
    .map(city => `
      <div class="recent-city" data-city="${escapeHtml(city)}">
        ${escapeHtml(city)}
      </div>
    `).join('');

  document.querySelectorAll('.recent-city').forEach(element => {
    element.addEventListener('click', (e) => {
      const city = e.currentTarget.getAttribute('data-city');
      showLoading();
      getWeather(city);
    });
  });
}

/**
 * Escapes HTML special characters
 * @param {string} unsafe - Unsafe string
 * @returns {string}
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Gets weather icon HTML
 * @param {string} condition - Weather condition
 * @returns {string}
 */
function getWeatherIcon(condition) {
  const iconMap = {
    clear: './icons/clear.svg',
    clouds: './icons/clouds.svg',
    rain: './icons/rain.svg',
    drizzle: './icons/drizzle.svg',
    thunderstorm: './icons/thunderstorm.svg',
    snow: './icons/snow.svg',
    mist: './icons/mist.svg',
    fog: './icons/fog.svg',
    haze: './icons/haze.svg'
  };
  
  const iconPath = iconMap[condition] || './icons/default.svg';
  
  return `
    <img src="${iconPath}" 
         alt="${condition}"
         onerror="this.onerror=null; this.src='./icons/default.svg'">
  `;
}

/**
 * Shows loading spinner
 * @returns {void}
 */
function showLoading() {
  elements.loadingSpinner.style.display = 'block';
}

/**
 * Hides loading spinner
 * @returns {void}
 */
function hideLoading() {
  elements.loadingSpinner.style.display = 'none';
}

/**
 * Shows error message
 * @param {string} message - Error message
 * @param {boolean} [persistent=false] - Whether error stays until dismissed
 * @returns {void}
 */
function showError(message, persistent = false) {
  elements.errorMessage.innerHTML = message;
  if (persistent) {
    elements.errorMessage.innerHTML += `<button id="refreshBtn" class="refresh-btn">Try Again</button>`;
    document.getElementById('refreshBtn').addEventListener('click', () => {
      const currentCity = elements.cityName.textContent.split(',')[0].trim();
      if (currentCity) getWeather(currentCity);
    });
  }
  elements.errorMessage.style.display = 'block';
  
  if (!persistent) {
    setTimeout(() => {
      elements.errorMessage.style.opacity = '0';
      setTimeout(() => {
        elements.errorMessage.style.display = 'none';
        elements.errorMessage.style.opacity = '1';
      }, 500);
    }, 5000);
  }
}

/**
 * Hides error message
 * @returns {void}
 */
function hideError() {
  elements.errorMessage.style.display = 'none';
  elements.errorMessage.style.opacity = '1';
}