import { env } from '../../config/env.js';
import { stripe } from '../../config/strip.js';
import { db } from '../db/mongodb.js';
import { ObjectId } from 'mongodb';

const checkOutPayment = async (req, res) => {
    try {
        const { id: userId, role: userRole, email: userEmail } = req.user;

        let amount;

        if (userRole === 'student') {
            amount = 1000;
        } else if (userRole === 'tutor') {
            amount = 1500;
        } else {
            return { message: 'Invalid role' };
        }

        // Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: userEmail,

            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${userRole} Premium Subscription`,
                        },
                        unit_amount: amount,
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],

            metadata: {
                userId: userId.toString(),
                role: userRole,
            },

            subscription_data: {
                metadata: {
                    userId: userId.toString(),
                    role: userRole,
                },
            },

            success_url: `${env.CLIENT_URL}/checkout/success`,
            cancel_url: `${env.CLIENT_URL}/checkout/cancel`,
        });

        // MongoDB-তে pending subscription তৈরি
        await db.collection('subscriptions').insertOne({
            userId: new ObjectId(userId),
            role: userRole,

            stripeCustomerId: null,
            stripeCheckoutSessionId: session.id,
            stripeSubscriptionId: null,

            subscriptionPlan: 'premium',

            amount: amount,
            currency: 'usd',

            status: 'pending',
            paymentStatus: 'pending',

            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return res.status(200).json({
            success: true,
            url: session.url,
        });
    } catch (error) {
        console.log(error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Payment session creation failed',
        });
    }
};
// stripe listen \
//   --forward-to http://localhost:4000/api/webhooks/stripe \
//   --all-snapshot

const stripeWebhook = async (req, res) => {
    console.log('========== STRIPE WEBHOOK ==========');

    const stripeEvent = req.body;
    const signature = req.headers['stripe-signature'];

    let event;

    try {
        const secret = env.STRIPE_WEBHOOK_SECRET;

        event = stripe.webhooks.constructEvent(stripeEvent, signature, secret);
    } catch (error) {
        console.error('Webhook signature error:', error.message);

        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                console.log('Checkout completed:', session.id);

                const subscriptionId =
                    typeof session.subscription === 'string'
                        ? session.subscription
                        : session.subscription?.id;

                const customerId =
                    typeof session.customer === 'string'
                        ? session.customer
                        : session.customer?.id;

                const subscription =
                    await stripe.subscriptions.retrieve(subscriptionId);

                const userId = session.metadata?.userId;

                if (!userId) {
                    console.error('User ID missing in metadata');
                    break;
                }

                await db.collection('subscriptions').updateOne(
                    {
                        stripeCheckoutSessionId: session.id,
                    },
                    {
                        $set: {
                            stripeCustomerId: customerId,
                            stripeSubscriptionId: subscriptionId,
                            status: subscription.status,
                            paymentStatus: 'paid',
                            updatedAt: new Date(),
                        },
                    },
                    {
                        upsert: true,
                    },
                );

                await db.collection('user').updateOne(
                    {
                        _id: new ObjectId(userId),
                    },
                    {
                        $set: {
                            subscriptionPlan: 'premium',
                            updatedAt: new Date(),
                        },
                    },
                );

                console.log('Subscription activated successfully');

                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;

                const subscriptionId =
                    typeof invoice.subscription === 'string'
                        ? invoice.subscription
                        : invoice.subscription?.id;

                if (subscriptionId) {
                    await db.collection('subscriptions').updateOne(
                        {
                            stripeSubscriptionId: subscriptionId,
                        },
                        {
                            $set: {
                                status: 'past_due',
                                paymentStatus: 'failed',
                                updatedAt: new Date(),
                            },
                        },
                        {
                            upsert: true,
                        },
                    );
                }

                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;

                await db.collection('subscriptions').updateOne(
                    {
                        stripeSubscriptionId: subscription.id,
                    },
                    {
                        $set: {
                            status: 'canceled',
                            paymentStatus: 'failed',
                            updatedAt: new Date(),
                        },
                    },
                    {
                        upsert: true,
                    },
                );

                await db.collection('user').updateOne(
                    {
                        _id: new ObjectId(
                            (
                                await db.collection('subscriptions').findOne({
                                    stripeSubscriptionId: subscription.id,
                                })
                            )?.userId,
                        ),
                    },
                    {
                        $set: {
                            subscriptionPlan: 'free',
                        },
                    },
                );

                break;
            }

            default:
                console.log('Unhandled event:', event.type);
        }

        return res.status(200).json({
            received: true,
        });
    } catch (error) {
        console.error('Webhook processing error:', error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const paymentsController = {
    checkOutPayment,
    stripeWebhook,
};
