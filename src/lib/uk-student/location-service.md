# UK Location Service Documentation

## Overview

The UK Location Service provides Birmingham-specific intelligence for route calculation, weather forecasting, and store location services. It's designed specifically for UK students traveling between Five Ways, University of Birmingham, and Selly Oak.

## Features

### 🚴 Route Calculation
- **Multi-modal transport**: Bike, walk, and train routes
- **Real-time conditions**: Weather-aware recommendations
- **Cost optimization**: £2.05-2.10 train fare tracking
- **Birmingham-specific**: Local elevation and route knowledge

### 🌤️ Weather Integration
- **OpenWeatherMap API**: Real-time weather data
- **7-day forecasts**: Plan ahead for cycling vs train
- **Condition mapping**: Sunny, cloudy, rainy, windy, snowy
- **Fallback data**: Works offline with estimated weather

### 🏪 Store Location Database
- **5 Birmingham stores**: Aldi, Tesco, Sainsbury's, Premier, University Superstore
- **Opening hours**: Accurate daily schedules
- **Price levels**: Budget, mid-range, premium categorization
- **Travel time estimates**: Walking and cycling durations

### 💾 Offline Caching
- **IndexedDB storage**: Persistent offline data
- **Route caching**: 60-minute default TTL
- **Weather caching**: 30-minute default TTL
- **Automatic cleanup**: Expired data removal

## Quick Start

```typescript
import { UKLocationService } from '../lib/uk-student/location-service';

// Initialize service
const config = {
  googleMapsApiKey: 'your-google-maps-key',
  weatherApiKey: 'your-openweather-key',
  defaultLocation: { latitude: 52.4508, longitude: -1.9305 },
  cacheDuration: 60 // minutes
};

const locationService = new UKLocationService(config);

// Calculate route
const route = await locationService.getBirminghamRoute(
  { name: 'Five Ways', coordinates: [52.4751, -1.9180], type: 'transport' },
  { name: 'University', coordinates: [52.4508, -1.9305], type: 'university' },
  'bike'
);

// Get weather forecast
const weather = await locationService.getWeatherForecast(
  { name: 'Birmingham', coordinates: [52.4508, -1.9305], type: 'other' },
  7
);

// Find nearby stores
const stores = await locationService.getNearbyStores(
  { name: 'Selly Oak', coordinates: [52.4373, -1.9416], type: 'transport' },
  2000 // 2km radius
);
```

## API Endpoints

### Route Calculation
```http
POST /api/uk-student/location/route
Content-Type: application/json

{
  "from": "five-ways",
  "to": "university", 
  "method": "bike",
  "preferences": {
    "conditions": {
      "weather": { "condition": "rainy", "temperature": 10 },
      "energyLevel": 0.7,
      "timeOfDay": "08:30",
      "hasGymBag": true
    }
  }
}
```

### Weather Forecast
```http
GET /api/uk-student/location/weather?location=university&days=7
```

### Nearby Stores
```http
GET /api/uk-student/location/stores?location=selly-oak&radius=2000
```

### Route Recommendations
```http
POST /api/uk-student/location/recommendations
Content-Type: application/json

{
  "from": "five-ways",
  "to": "university",
  "preferences": {
    "weatherSensitive": true,
    "costSensitive": true,
    "timeSensitive": false
  }
}
```

## Birmingham Locations

### Transport Hubs
- **Five Ways**: Main transport interchange
- **University Station**: On-campus train station
- **Selly Oak Station**: South Birmingham transport hub

### University Areas
- **University of Birmingham**: Main campus
- **Selly Oak**: Student residential area

### Stores Database
- **Aldi Selly Oak**: Budget supermarket, 8am-10pm weekdays
- **Tesco Selly Oak**: 24-hour convenience, premium prices
- **Sainsbury's Selly Oak**: Mid-range, good selection
- **Premier Selly Oak**: Convenience store, higher prices
- **University Superstore**: On-campus, limited hours

## Route Intelligence

### Cycling Routes
- **Distance calculation**: Haversine formula with local adjustments
- **Elevation awareness**: Birmingham's hilly terrain considered
- **Weather suitability**: 0.7 base score, adjusted for conditions
- **Safety rating**: University area gets higher ratings

### Train Routes
- **Fixed schedules**: 6-12 minute journeys between stations
- **Cost tracking**: £2.05-2.10 realistic fare range
- **Weather independence**: Always available option
- **High safety rating**: 5/5 stars for all train routes

### Walking Routes
- **Conservative estimates**: 5km/h average speed
- **Weather resilience**: 0.9 suitability score
- **Accessibility**: Works for all fitness levels
- **Zero cost**: Always free option

## Weather Integration

### Condition Mapping
```typescript
const weatherMapping = {
  'Clear': 'sunny',      // Great for cycling
  'Clouds': 'cloudy',    // Good for cycling
  'Rain': 'rainy',       // Prefer train/indoor
  'Snow': 'snowy',       // Avoid cycling
  'Thunderstorm': 'rainy', // Definitely avoid cycling
  'Mist': 'cloudy'       // Reduced visibility
};
```

### Travel Recommendations
- **Sunny weather**: Cycling recommended, 10% faster
- **Rainy weather**: Train preferred, cycling 30% slower
- **Windy conditions**: Cycling 20% slower
- **Cold weather** (<5°C): All methods 10% slower

## Caching Strategy

### Memory Cache
- **Route calculations**: 60-minute TTL
- **Weather data**: 30-minute TTL
- **Fast access**: Immediate response for repeated requests

### Offline Cache (IndexedDB)
- **Persistent storage**: Survives browser restarts
- **Automatic expiry**: Cleans up old data
- **Fallback support**: Works when APIs are unavailable

### Cache Statistics
```typescript
const stats = await locationService.getCacheStats();
// Returns: totalRoutes, totalWeather, expiredRoutes, cacheSize
```

## Error Handling

### API Failures
- **Google Maps**: Falls back to distance-based estimation
- **OpenWeather**: Uses Birmingham weather patterns
- **Network errors**: Graceful degradation to cached data

### Validation
- **Location validation**: Checks against Birmingham database
- **Parameter validation**: Type and range checking
- **Fallback responses**: Always returns usable data

### Offline Support
- **Service worker ready**: Can be integrated with PWA
- **IndexedDB storage**: Persistent offline data
- **Graceful degradation**: Reduced functionality when offline

## Performance Optimization

### Route Calculation
- **Distance-based shortcuts**: Skip API for very short routes
- **Elevation caching**: Pre-calculated Birmingham elevations
- **Batch processing**: Multiple routes calculated efficiently

### Weather Caching
- **Shared forecasts**: Same data for nearby locations
- **Predictive caching**: Pre-fetch likely needed data
- **Compression**: Efficient storage of weather data

### Store Queries
- **Spatial indexing**: Fast proximity searches
- **Pre-calculated distances**: Birmingham store distances cached
- **Opening hours optimization**: Quick availability checks

## Testing

### Unit Tests
- **Route calculations**: Distance, duration, cost accuracy
- **Weather parsing**: API response handling
- **Store filtering**: Proximity and availability logic
- **Cache management**: TTL and cleanup functionality

### Integration Tests
- **API endpoints**: Request/response validation
- **Error scenarios**: Network failures, invalid data
- **Performance tests**: Response time requirements
- **Birmingham data**: Location accuracy validation

### Test Coverage
```bash
npm test src/test/uk-student/location-service.test.ts
npm test src/test/uk-student/location-api.test.ts
```

## Configuration

### Environment Variables
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

### Service Configuration
```typescript
const config: UKLocationServiceConfig = {
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  weatherApiKey: process.env.OPENWEATHER_API_KEY,
  defaultLocation: { latitude: 52.4508, longitude: -1.9305 }, // University of Birmingham
  cacheDuration: 60 // minutes
};
```

## Monitoring

### Cache Health
```typescript
// Monitor cache performance
const stats = await locationService.getCacheStats();
console.log(`Cache hit ratio: ${stats.totalRoutes / stats.expiredRoutes}`);
```

### API Usage
- **Rate limiting**: Respect Google Maps and OpenWeather limits
- **Cost tracking**: Monitor API usage costs
- **Error rates**: Track API failure rates

### Performance Metrics
- **Response times**: Route calculation speed
- **Cache efficiency**: Hit/miss ratios
- **Offline capability**: Degraded mode performance

## Future Enhancements

### Real-time Data
- **Live train times**: Integration with National Rail APIs
- **Traffic conditions**: Real-time cycling route adjustments
- **Store availability**: Live opening hours and stock levels

### Machine Learning
- **Route preferences**: Learn user preferences over time
- **Weather patterns**: Improve local weather predictions
- **Travel time accuracy**: Refine estimates based on actual data

### Extended Coverage
- **More locations**: Expand beyond Birmingham triangle
- **Additional transport**: Bus routes, car sharing
- **University integration**: Campus building locations

## Support

### Common Issues
1. **API key errors**: Check environment variable configuration
2. **Cache issues**: Clear IndexedDB storage in browser dev tools
3. **Location not found**: Verify location name matches Birmingham database
4. **Slow responses**: Check network connectivity and API status

### Debugging
```typescript
// Enable debug logging
const service = new UKLocationService({
  ...config,
  debug: true
});

// Clear all caches
await service.clearAllCaches();

// Get detailed cache statistics
const stats = await service.getCacheStats();
console.log('Cache stats:', stats);
```

### Contributing
- **Location data**: Submit updates for Birmingham locations
- **Route improvements**: Suggest better route calculations
- **Weather patterns**: Contribute local weather knowledge
- **Performance optimizations**: Help improve response times