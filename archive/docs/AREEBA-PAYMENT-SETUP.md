# Areeba Payment Gateway Integration for Lebanon

Your e-commerce platform is now configured with **Areeba** - a Mastercard payment gateway widely used by Lebanese banks.

## What is Areeba?

Areeba is a secure payment gateway powered by Mastercard, used by major Lebanese banks including:
- **Bank Audi**
- **BLOM Bank**
- **BankMed**
- **Credit Libanais**
- **Byblos Bank**
- **Banque Libano-Française**

## Features

✅ Accept all major credit/debit cards (Visa, Mastercard, AmEx)
✅ 3D Secure authentication for fraud protection
✅ Multi-currency support (LBP, USD, EUR)
✅ PCI DSS compliant
✅ Local Lebanese support

## Getting Areeba Merchant Account

### Step 1: Contact Your Bank

Reach out to one of the Lebanese banks offering Areeba:

**Bank Audi:**
- Phone: +961 1 200 250
- Email: customercare@bankaudi.com.lb

**BLOM Bank:**
- Phone: +961 1 743 300
- Email: info@blom.com.lb

**BankMed:**
- Phone: +961 1 708 070
- Email: info@bankmed.com.lb

### Step 2: Merchant Application

You'll need to provide:
- Business registration documents
- Commercial register
- Tax ID
- Bank account details
- Website/business information
- Expected transaction volume

### Step 3: Get Credentials

After approval (typically 1-2 weeks), you'll receive:
- **Merchant ID** - Your unique identifier
- **API Password** - Authentication credential
- **API URL** - Gateway endpoint
- **Test credentials** - For development

### Step 4: Configure Your System

Edit `/home/husseinkhrayzat/web/backend/.env`:

```bash
PAYMENT_PROVIDER=areeba

# Replace these with your actual credentials
AREEBA_API_URL=https://your-bank.gateway.mastercard.com/api/rest
AREEBA_MERCHANT_ID=your_merchant_id
AREEBA_API_PASSWORD=your_api_password
AREEBA_VERSION=57
```

### Step 5: Restart Application

```bash
cd /home/husseinkhrayzat/web
./stop.sh
./start.sh
```

## How It Works

### Customer Experience:

1. **Add to cart** → Browse and select products
2. **Checkout** → Fill shipping information
3. **Payment** → Click "Pay with Card"
4. **Areeba page** → Redirected to secure Areeba checkout
5. **Enter card** → Visa/Mastercard details
6. **3D Secure** → Bank verification (OTP/password)
7. **Confirmation** → Return to your site with order confirmed

### Technical Flow:

```
Your Site → Create Order → Backend creates Areeba session
                ↓
        Redirect to Areeba hosted page
                ↓
        Customer enters card details
                ↓
           3D Secure verification
                ↓
        Payment processed by bank
                ↓
    Redirect back to your orders page
                ↓
           Cart automatically cleared
```

## Currency Support

Areeba supports multiple currencies:
- **LBP** (Lebanese Pounds)
- **USD** (US Dollars)
- **EUR** (Euros)

Current configuration uses **LBP**. Product prices should be set in Lebanese Pounds.

## Test Mode

Your system is currently in **TEST MODE** because real Areeba credentials aren't configured yet.

**Test mode behavior:**
- Shows test payment interface
- No real card processing
- Order is created successfully
- Cart is cleared
- Useful for development

**To enable live payments:**
1. Get real credentials from your bank
2. Update `.env` with actual `AREEBA_MERCHANT_ID` and `AREEBA_API_PASSWORD`
3. Restart servers

## Fees

Areeba transaction fees vary by bank, typically:
- **Local cards**: 2-3% per transaction
- **International cards**: 3-4% per transaction
- **Monthly fee**: Some banks charge monthly maintenance
- **Setup fee**: One-time setup cost

Contact your bank for exact pricing.

## Security

Areeba provides:
- **PCI DSS Level 1** compliance
- **3D Secure** authentication
- **SSL/TLS** encryption
- **Tokenization** for recurring payments
- **Fraud detection** tools

Customer card details never touch your server - all handled by Areeba's secure platform.

## Production Checklist

Before going live:

- [ ] Get approved merchant account
- [ ] Receive production credentials
- [ ] Update `.env` with real credentials
- [ ] Enable HTTPS on your website
- [ ] Test with real cards (small amounts)
- [ ] Set up webhook notifications (optional)
- [ ] Train staff on payment reconciliation
- [ ] Set up refund procedures

## Switching Payment Providers

### Use Areeba (Current):
```bash
PAYMENT_PROVIDER=areeba
```

### Use Cash on Delivery:
```bash
PAYMENT_PROVIDER=cash
```

### Use Stripe (International):
```bash
PAYMENT_PROVIDER=stripe
```

Then restart: `./stop.sh && ./start.sh`

## Webhook Setup (Optional)

To receive real-time payment notifications:

1. **In Areeba dashboard** → Settings → Webhooks
2. **Add URL**: `https://yourdomain.com/api/webhooks/areeba`
3. **Select events**: 
   - Payment completed
   - Payment failed
   - Refund processed

## Refunds

To process refunds:

1. **Admin panel** → View order
2. **Bank dashboard** → Initiate refund
3. **Or API call** → Use refund endpoint

Refunds typically take 5-10 business days to appear on customer's card.

## Support

### Technical Issues:
- **Areeba Support**: Your bank's technical team
- **Documentation**: Provided by your bank
- **Integration help**: Bank's developer portal

### Transaction Issues:
- Contact your bank's merchant support
- Have transaction ID ready
- Check merchant dashboard for details

## Common Issues

### "Merchant ID invalid"
- Check `AREEBA_MERCHANT_ID` is correct
- Ensure no extra spaces in `.env`
- Verify credentials with your bank

### "Payment failed"
- Check customer's card has sufficient funds
- Verify card is not blocked
- Ensure 3D Secure is working
- Check bank's service status

### "Session expired"
- Customer took too long to pay
- Ask customer to try again
- Sessions typically expire after 15-30 minutes

## Comparison: Areeba vs Others

| Feature | Areeba | Stripe | Cash on Delivery |
|---------|--------|--------|------------------|
| **Setup Time** | 1-2 weeks | Minutes | Instant |
| **Best For** | Lebanese customers | International | Local Lebanon |
| **Cards** | Visa, Mastercard | All cards | N/A |
| **Fees** | 2-4% | 2.9% + $0.30 | Free |
| **Support** | Local bank | Email/Chat | Manual |
| **3D Secure** | ✅ Yes | ✅ Yes | N/A |
| **LBP Support** | ✅ Yes | ❌ No | ✅ Yes |

## Recommended for Lebanon

**Areeba** is the best choice for accepting online card payments in Lebanon because:
- ✅ Trusted by Lebanese banks
- ✅ Supports LBP currency
- ✅ Local customer support
- ✅ Familiar to Lebanese users
- ✅ Complies with Lebanese regulations

Combined with **Cash on Delivery**, you can serve all customer preferences!

## Next Steps

1. **Contact your bank** to start merchant application
2. **While waiting**, use test mode for development
3. **Once approved**, update credentials
4. **Test thoroughly** before going live
5. **Launch** and start accepting payments!

---

**Need help?** Contact your bank's merchant services team or check their developer documentation.
