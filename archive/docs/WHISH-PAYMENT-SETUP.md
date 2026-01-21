# Payment Options for Lebanon

Your e-commerce platform now supports multiple payment methods suitable for Lebanon.

## Available Payment Methods

### 1. Cash on Delivery (COD) - **Currently Active** ✅

Perfect for Lebanon where cash is preferred. Customers order online and pay cash when the product is delivered.

**How it works:**
- Customer places order online
- Order is confirmed immediately
- Customer pays cash upon delivery
- Admin marks order as paid after receiving cash

**Configuration:**
```bash
PAYMENT_PROVIDER=cash
```

### 2. Stripe (International Cards)

Accept international credit/debit cards. Good if you have customers outside Lebanon.

**Configuration:**
```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

Get keys from: https://dashboard.stripe.com

## Current Setup

Your system is configured for **Cash on Delivery**. 

### Customer Experience:

1. ✅ Customer adds products to cart
2. ✅ Fills shipping information at checkout
3. ✅ Clicks "Continue to Payment"
4. ✅ Sees Cash on Delivery confirmation with amount
5. ✅ Clicks "Confirm Order"
6. ✅ Order is created - pays cash when delivered

### Admin Workflow:

1. View new orders in admin panel
2. Process and ship the order
3. Call customer to arrange delivery
4. Collect cash upon delivery
5. Mark order as "paid" in admin panel

## Payment Provider Comparison

| Feature | Cash on Delivery | Stripe |
|---------|-----------------|--------|
| **Setup** | No registration needed | Requires Stripe account |
| **Transaction Fee** | Free | 2.9% + $0.30 per transaction |
| **Payment** | Cash at delivery | Online credit card |
| **Lebanon Support** | ✅ Perfect | ❌ Limited in Lebanon |
| **International** | ❌ Local only | ✅ Worldwide |
| **Payment Security** | Manual process | Automatic & secure |
| **Best For** | Lebanese customers | International customers |

## Recommended for Lebanon: Cash on Delivery

Given Lebanon's economic situation and limited international payment processing, **Cash on Delivery is recommended** as the primary payment method.

## Alternative Lebanese Payment Solutions

If you want to accept online payments in Lebanon, consider:

1. **OMT (Omt Money Transfer)** - Contact OMT for merchant services
2. **Whish Money** - Currently a consumer wallet app (not for merchants yet)
3. **Bank transfers** - Accept bank wire transfers manually
4. **Crypto payments** - USDT/USDC for some tech-savvy customers

## Switching Payment Providers

Edit `/home/husseinkhrayzat/web/backend/.env`:

```bash
# For Cash on Delivery (Current)
PAYMENT_PROVIDER=cash

# For Stripe
PAYMENT_PROVIDER=stripe

# For Whish (when available)
PAYMENT_PROVIDER=whish
```

Then restart:
```bash
./stop.sh && ./start.sh
```

## Managing COD Orders

### In Admin Panel:

1. Go to **Orders** tab
2. View order details
3. Note: COD orders show as "pending" payment
4. After delivering and collecting cash:
   - Manually mark as "paid" in your database
   - Or add an admin button to mark orders as paid

## Future Payment Integration

When Lebanon's banking system stabilizes or new payment gateways become available, you can easily switch by:

1. Adding the new payment service in `backend/src/services/`
2. Updating `PAYMENT_PROVIDER` in `.env`
3. System automatically adapts to new provider

Your code is ready for Stripe, Whish (when available), or any other provider you add.

