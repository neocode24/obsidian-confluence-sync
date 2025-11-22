#!/bin/bash

# Extract access token from Obsidian plugin data
TOKEN=$(cat "/Users/neocode24/Library/Mobile Documents/iCloud~md~obsidian/Documents/neocode24/.obsidian/plugins/confluence-sync/data.json" | jq -r '.tenants[0].oauthToken.accessToken')
CLOUD_ID=$(cat "/Users/neocode24/Library/Mobile Documents/iCloud~md~obsidian/Documents/neocode24/.obsidian/plugins/confluence-sync/data.json" | jq -r '.tenants[0].cloudId')

echo "Testing Atlassian OAuth token..."
echo "CloudId: $CLOUD_ID"
echo ""

# Test 1: Get accessible resources
echo "=== Test 1: Get Accessible Resources ==="
curl -s -X GET "https://api.atlassian.com/oauth/token/accessible-resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" | jq '.'

echo ""
echo "=== Test 2: Get Current User ==="
curl -s -X GET "https://api.atlassian.com/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" | jq '.'

echo ""
echo "=== Test 3: Search Confluence (v1 API) ==="
curl -s -X GET "https://api.atlassian.com/ex/confluence/$CLOUD_ID/wiki/rest/api/content/search?cql=type=page&limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" | jq '.'
