#!/bin/bash
# Test the WooCommerce API implementation
# Usage: ./verify-api.sh <consumer_key> <consumer_secret> <base_url>

KEY=$1
SECRET=$2
URL=${3:-"http://localhost:3000"}

if [ -z "$KEY" ] || [ -z "$SECRET" ]; then
    echo "Usage: ./verify-api.sh <consumer_key> <consumer_secret> [base_url]"
    echo "Example: ./verify-api.sh ck_... cs_... https://api.yoursite.com"
    echo ""
    echo "Note: You must first insert a key pair into the 'api_keys' table in your database."
    exit 1
fi

echo "Testing WooCommerce API at $URL..."

# Create Product
echo "----------------------------------------"
echo "1. Creating Product..."
CREATE_RES=$(curl -s -X POST "$URL/wp-json/wc/v3/products" \
    -u "$KEY:$SECRET" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "API Test Product with Hebrew Price",
        "regular_price": "100",
        "description": "Created via API",
        "short_description": "Test short desc",
        "stock_quantity": 10,
        "images": [{"src": "https://placehold.co/600x400"}],
        "meta_data": [
            { "key": "price_ils", "value": "120" }
        ]
    }')

echo "Response: $CREATE_RES"

# Simple extraction of ID (requires `jq` ideally, but using grep/cut for portability)
ID=$(echo $CREATE_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ -z "$ID" ]; then
    ID=$(echo $CREATE_RES | grep -o '"id":[^,]*' | cut -d':' -f2 | tr -d ' }')
fi

if [ -z "$ID" ] || [ "$ID" == "null" ] || [ "$ID" == "" ]; then
    echo "Failed to create product or parse ID."
    # Don't exit, just continue to show potential errors
else
    echo "Created Product ID: $ID"
    
    # Get Product
    echo "----------------------------------------"
    echo "2. Fetching Product..."
    curl -s -X GET "$URL/wp-json/wc/v3/products/$ID" \
        -u "$KEY:$SECRET"
    
    # Update Product
    echo "----------------------------------------"
    echo "3. Updating Product Price to 150..."
    curl -s -X PUT "$URL/wp-json/wc/v3/products/$ID" \
        -u "$KEY:$SECRET" \
        -H "Content-Type: application/json" \
        -d '{ "regular_price": "150" }'
    
    # Delete Product
    echo "----------------------------------------"
    echo "4. Deleting Product..."
    curl -s -X DELETE "$URL/wp-json/wc/v3/products/$ID" \
        -u "$KEY:$SECRET"
fi

echo ""
echo "Done."
