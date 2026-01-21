# Areeba Payment Gateway Test Interface

This test interface allows you to see exactly what data your website sends to the Areeba payment gateway.

## 🎯 Purpose

- **Debug Payment Integration**: See the exact JSON payload sent to Areeba
- **Verify Configuration**: Check if your Areeba credentials are properly configured
- **Test Payment Flow**: Create test payment sessions without going through the full checkout
- **Inspect Responses**: View detailed responses from the Areeba gateway
- **Authentication Testing**: Verify authentication headers are correctly formatted

## 🚀 How to Use

### 1. Access the Test Page

Open your browser and navigate to:
```
http://localhost:3000/test-areeba.html
```

Or if deployed:
```
https://your-domain.com/test-areeba.html
```

### 2. Create a Test Payment

1. **Enter Amount**: The payment amount (e.g., 50.00)
2. **Select Currency**: Choose USD, LBP, or EUR
3. **Order Number**: Leave empty for auto-generation or enter a custom order number
4. **Description**: Brief description of the order
5. Click **"Create Payment Session"**

### 3. View the Results

The interface shows four tabs:

#### 📤 Request Data
Shows the exact JSON payload sent to Areeba's API:
```json
{
  "apiOperation": "CREATE_CHECKOUT_SESSION",
  "order": {
    "id": "ORD1234567890",
    "amount": "50.00",
    "currency": "USD",
    "description": "Test Order"
  },
  "interaction": {
    "operation": "PURCHASE",
    "returnUrl": "http://localhost:3000/orders.html",
    "cancelUrl": "http://localhost:3000/checkout.html"
  }
}
```

#### 📥 Gateway Response
Shows Areeba's response including:
- Session ID
- Checkout URL
- Status codes
- Error messages (if any)

#### 🔐 Request Headers
Shows authentication headers:
- Authorization (Basic Auth with merchant credentials)
- Content-Type
- Accept headers

#### ⚙️ Configuration
Shows your current Areeba settings:
- API URL
- Merchant ID
- API Version
- Test Mode status

## 🔧 Configuration

### Environment Variables

Make sure these are set in your `/home/husseinkhrayzat/web/backend/.env` file:

```bash
# Areeba Payment Gateway
PAYMENT_PROVIDER=areeba
AREEBA_API_URL=https://your-bank.gateway.mastercard.com/api/rest
AREEBA_MERCHANT_ID=your_merchant_id
AREEBA_API_PASSWORD=your_api_password
AREEBA_VERSION=57
```

### Test Mode vs Production Mode

**Test Mode** (when credentials are not configured):
- Shows "testMode": true
- API calls will fail (expected behavior)
- Still shows what data would be sent

**Production Mode** (when credentials are configured):
- Shows "testMode": false
- Makes actual API calls to Areeba
- Creates real payment sessions (in test or live mode depending on credentials)

## 📊 What You'll See

### Successful Response Example
```json
{
  "success": true,
  "timestamp": "2026-01-20T10:30:00.000Z",
  "config": {
    "apiUrl": "https://bankalfalah.gateway.mastercard.com/api/rest",
    "merchantId": "TEST123456",
    "apiVersion": "57",
    "passwordConfigured": true,
    "testMode": false
  },
  "requestData": { ... },
  "responseData": {
    "session": {
      "id": "SESSION1234567890",
      "version": "57"
    },
    "checkoutUrl": "https://gateway.mastercard.com/checkout/..."
  },
  "httpStatus": 200
}
```

### Error Response Example
```json
{
  "success": false,
  "error": {
    "message": "Request failed with status code 401",
    "status": 401,
    "data": {
      "error": {
        "cause": "INVALID_CREDENTIALS",
        "explanation": "Invalid authentication credentials"
      }
    }
  }
}
```

## 🔍 Common Issues

### 1. Authentication Errors (401)
**Problem**: Invalid merchant credentials
**Solution**: 
- Check `AREEBA_MERCHANT_ID` is correct
- Verify `AREEBA_API_PASSWORD` is correct
- Ensure no extra spaces in .env file

### 2. Not Found Errors (404)
**Problem**: Wrong API URL
**Solution**:
- Verify `AREEBA_API_URL` matches your bank's gateway
- Common URLs:
  - Bank Audi: `https://bankaudi.gateway.mastercard.com/api/rest`
  - BLOM Bank: `https://blom.gateway.mastercard.com/api/rest`
  - BankMed: `https://bankmed.gateway.mastercard.com/api/rest`

### 3. Test Mode Always Active
**Problem**: Credentials not configured
**Solution**:
- Set `AREEBA_MERCHANT_ID` in .env
- Set `AREEBA_API_PASSWORD` in .env
- Restart the backend server

### 4. CORS Errors
**Problem**: Frontend can't access backend API
**Solution**:
- Check `CORS_ORIGIN` in .env matches your frontend URL
- Restart backend after changes

## 💡 Tips

1. **Copy Data**: Use the "📋 Copy" buttons to copy request/response data
2. **Multiple Tests**: Change the order number between tests to create unique sessions
3. **Currency Testing**: Test with different currencies to see currency formatting
4. **Save Results**: Copy and save successful configurations for documentation

## 🔒 Security Notes

- **Password Masking**: The Authorization header is partially masked in the UI
- **Test Environment**: Only use test credentials on this page
- **Production**: In production, consider restricting access to this page to admin users only
- **Logging**: All test requests are logged on the backend for debugging

## 📞 Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check backend logs for API errors
3. Verify all environment variables are set correctly
4. Ensure the backend server is running

## 🛠️ API Endpoints

This test page uses these endpoints:

```
POST /api/test/areeba-payment
- Creates a test payment session
- Returns request/response details

GET /api/test/areeba-config
- Returns current Areeba configuration
- No sensitive data exposed
```

## 📝 Example Use Cases

### 1. Debug Failed Payments
Use this page when customers report payment failures to see the exact error from Areeba.

### 2. Verify New Configuration
After receiving Areeba credentials from your bank, test them here before deploying.

### 3. Currency Testing
Test different currencies to ensure proper formatting (2 decimal places, currency codes).

### 4. Integration Documentation
Use the captured requests/responses for documentation or support tickets.

---

**Created**: January 2026
**Version**: 1.0
**Compatibility**: Areeba API Version 57
