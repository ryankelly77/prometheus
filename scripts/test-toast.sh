#!/bin/bash
# Test Toast API

# Get token
echo "=== Authenticating with Toast ==="
AUTH_RESPONSE=$(curl -s -X POST "https://ws-api.toasttab.com/authentication/v1/authentication/login" \
  -H "Content-Type: application/json" \
  -d '{"clientId":"fVi0HgxbkKlHucJUY5ZIGN4SkF4efvuZ","clientSecret":"b7382G25hHguaJJFK7aO-hvBpx8KBWmHj6G3r7Ep_blVuHmp9gGr_8b0LUnXeGn_","userAccessType":"TOAST_MACHINE_CLIENT"}')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  echo "$AUTH_RESPONSE"
  exit 1
fi

echo "Token obtained successfully!"
echo ""

# Get restaurant info
RESTAURANT_GUID="7d5f8162-aeda-436a-85d0-7191e37b96c3"
echo "=== Fetching Restaurant Info ==="
curl -s "https://ws-api.toasttab.com/restaurants/v1/restaurants/$RESTAURANT_GUID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Toast-Restaurant-External-ID: $RESTAURANT_GUID" | python3 -m json.tool 2>/dev/null

echo ""
echo "=== Done ==="
