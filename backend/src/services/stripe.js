const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create Stripe Checkout Session (with redirect)
 */
exports.createPaymentIntent = async (amount, currency, metadata) => {
    try {
        const amountInCents = Math.round(amount * 100);
        
        // Create a Checkout Session that redirects to Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: `Order #${metadata.orderNumber}`,
                            description: 'Tracy Talks Health - Wellness Products',
                        },
                        unit_amount: amountInCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/orders.html?session_id={CHECKOUT_SESSION_ID}&payment_status=success`,
            cancel_url: `${process.env.FRONTEND_URL}/checkout.html?payment_status=cancelled`,
            metadata: {
                orderId: metadata.orderId.toString(),
                orderNumber: metadata.orderNumber,
                userId: metadata.userId.toString(),
            },
            customer_email: metadata.email || undefined,
        });

        console.log('Stripe Checkout Session created:', {
            id: session.id,
            url: session.url,
            success_url: session.success_url,
            cancel_url: session.cancel_url
        });

        return {
            id: session.id,
            client_secret: session.id, // For consistency with other payment providers
            session_id: session.id,
            checkout_url: session.url,
            payment_url: session.url,
            amount: amount,
            currency: currency,
        };
    } catch (error) {
        console.error('Stripe checkout session creation error:', error);
        throw new Error(`Stripe checkout failed: ${error.message}`);
    }
};

/**
 * Retrieve Checkout Session
 */
exports.getCheckoutSession = async (sessionId) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        return session;
    } catch (error) {
        console.error('Error retrieving checkout session:', error);
        throw new Error(`Failed to retrieve session: ${error.message}`);
    }
};

/**
 * Verify webhook signature
 */
exports.verifyWebhookSignature = (payload, signature) => {
    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        return event;
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        throw new Error('Invalid signature');
    }
};

/**
 * Handle webhook events
 */
exports.handleWebhook = async (event) => {
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            return {
                orderId: session.metadata.orderId,
                paymentStatus: 'succeeded',
                paymentIntentId: session.payment_intent,
            };
        
        case 'checkout.session.expired':
            const expiredSession = event.data.object;
            return {
                orderId: expiredSession.metadata.orderId,
                paymentStatus: 'failed',
            };
        
        default:
            console.log(`Unhandled event type: ${event.type}`);
            return null;
    }
};
