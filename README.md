# Weather App

A responsive weather application that displays current weather conditions and 5-day forecasts for any city worldwide.

## **Features**

- **Current weather display**:
  - Temperature
  - Weather conditions
  - Humidity
  - Wind speed
- **5-day weather forecast**
- **Temperature unit toggle** (Celsius/Fahrenheit)
- **Geolocation support**
- **Recent searches history**
- **Offline mode** with cached data
- **Responsive design** for all screen sizes
- **Dynamic background** based on weather conditions

## **How to Run**

### **Option 1: Open in Browser**
Simply open the `index.html` file in any modern web browser.

### **Option 2: VS Code Live Server**
1. Open the project in VS Code
2. Install the "Live Server" extension if not already installed
3. Right-click on `index.html` and select "Open with Live Server"

## **API Key**
The app uses OpenWeatherMap API with a free-tier API key included in the code. For production use:

1. Get your own API key from [OpenWeatherMap](https://openweathermap.org/)
2. Replace the `API_KEY` value in the `CONFIG` object in `script.js`

## **File Structure**
weather-app/
├── index.html # Main HTML file
├── style.css # Stylesheet
├── script.js # Main JavaScript file
├── README.md # This file
├── images/ # Background images
│ ├── clear.png
│ ├── clouds.png
│ ├── default.png
│ ├── drizzle.png
│ ├── fog.png
│ ├── haze.png
│ ├── mist.png
│ ├── rain.png
│ ├── snow.png
│ └── thunderstorm.png
└── icons/ # Weather icons
├── clear.svg
├── clouds.svg
├── default.svg
├── drizzle.svg
├── fog.svg
├── haze.svg
├── mist.svg
├── rain.svg
├── snow.svg
└── thunderstorm.svg

## **Browser Support**
The app works on all modern browsers including:

- **Chrome** (latest)
- **Firefox** (latest)
- **Edge** (latest)
- **Safari** (latest)