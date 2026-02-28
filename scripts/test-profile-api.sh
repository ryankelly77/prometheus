#!/bin/bash

# Test script for Restaurant Profile API endpoints
# Usage: ./scripts/test-profile-api.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== Restaurant Profile API Tests ==="
echo "Base URL: $BASE_URL"
echo ""

# These tests require authentication, so they will return 401 without a valid session
# This is expected behavior - run these in a browser or with a valid auth cookie

echo "1. GET /api/restaurant/descriptors (list all types)"
curl -s -X GET "$BASE_URL/api/restaurant/descriptors" | head -c 500
echo ""
echo ""

echo "2. GET /api/restaurant/descriptors?type=fine_dining"
curl -s -X GET "$BASE_URL/api/restaurant/descriptors?type=fine_dining" | head -c 1000
echo ""
echo ""

echo "3. GET /api/restaurant/profile?locationId=test"
curl -s -X GET "$BASE_URL/api/restaurant/profile?locationId=test" | head -c 500
echo ""
echo ""

echo "4. POST /api/restaurant/profile (example body)"
echo '{
  "locationId": "<your-location-id>",
  "restaurantType": "fine_dining",
  "conceptDescription": "Modern French brasserie",
  "cuisineType": "French-inspired",
  "priceRange": "$$$",
  "seatingCapacity": 65,
  "neighborhood": "Pearl District",
  "targetDemographic": "Affluent professionals, 35-55",
  "selectedDescriptors": ["tasting_menu", "sommelier", "special_occasion", "dinner_only"]
}'
echo ""

echo "5. POST /api/intelligence/feedback (example body)"
echo '{
  "locationId": "<your-location-id>",
  "insightId": "<your-insight-id>",
  "rating": "helpful",
  "userComment": "Great insight!"
}'
echo ""

echo "=== Tests complete ==="
echo "Note: These endpoints require authentication. Test in browser with dev tools or use session cookie."
