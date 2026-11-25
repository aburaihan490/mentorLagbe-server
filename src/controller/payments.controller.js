import { env } from '../../config/env.js';
import { stripe } from '../../config/strip.js';
import { db } from '../db/mongodb.js';
import { ObjectId } from 'mongodb';

const checkOutPayment = async (req, res) => {
    try {
        // const userId = req.user.id;
        // const role = req.user.role;
        const { id: userId, role: userRole, email: userEmail } = req.user;

        let amount;

        if (userRole === 'student') {
            amount = 1000; // $10
        } else if (userRole === 'tutor') {
            amount = 1500; // $15
        } else {
            throw new CoustomError('Invalid role', 400);
        }
        //  priceId[role]
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

            success_url: `${env.CLIENT_URL}/checkout/success`,

            cancel_url: `${env.CLIENT_URL}/checkout/cancel`,
        });

        res.status(200).json({
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

const stripeWebhook = async (req, res) => {
    //    {
    //     Stripe Dashboard-এ কোন Event enable করবে?
    // Webhook Events
    // checkout.session.completed
    // Required

    // invoice.paid
    // Required

    // invoice.payment_failed
    // Required

    // customer.subscription.updated
    // Recommended

    // customer.subscription.deleted
    // Required
    // }
    // After payment, Stripe sends an event here.
    // step-1: Get the raw event body and Stripe's signature header.
    // req.body is a Buffer (from express.raw above); constructEvent needs it unparsed.
    const stripeEvent = req.body;
    const signature = req.headers['stripe-signature'];
    console.log('Stripe webhook reached!');

    console.log('Body:', req.body);
    console.log('Is Buffer:', Buffer.isBuffer(req.body));

    console.log('Signature:', req.headers['stripe-signature']);
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            stripeEvent,
            signature,
            env.STRIPE_WEBHOOK_SECRET,
        );
    } catch (error) {
        console.log('Webhook signature error:', error.message);

        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // Payment successful কিনা check
                if (session.payment_status !== 'paid') {
                    break;
                }

                const userId = session.metadata.userId;
                const role = session.metadata.role;

                // Stripe subscription retrieve
                const subscription = await stripe.subscriptions.retrieve(
                    session.subscription,
                );

                // 1. User collection update
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

                // 2. Subscription collection save
                await db.collection('subscriptions').updateOne(
                    {
                        stripeSubscriptionId: subscription.id,
                    },
                    {
                        $set: {
                            userId: new ObjectId(userId),
                            role: role,

                            stripeCustomerId: session.customer,
                            stripeSubscriptionId: subscription.id,

                            subscriptionPlan: 'premium',
                            amount: session.amount_total,
                            currency: session.currency,

                            status: subscription.status,
                            paymentStatus: session.payment_status,

                            updatedAt: new Date(),
                        },
                        $setOnInsert: {
                            createdAt: new Date(),
                        },
                    },
                    { upsert: true },
                );

                console.log('User upgraded to premium');

                break;
            }

            case 'invoice.paid': {
                console.log('Subscription invoice paid');
                const invoice = event.data.object;

                const subscriptionId =
                    typeof invoice.subscription === 'string'
                        ? invoice.subscription
                        : invoice.subscription?.id;

                if (subscriptionId) {
                    const subscription =
                        await stripe.subscriptions.retrieve(subscriptionId);

                    const result = await db
                        .collection('subscriptions')
                        .findOneAndUpdate(
                            { stripeSubscriptionId: subscriptionId },
                            {
                                $set: {
                                    paymentStatus: 'paid',
                                    status: subscription.status,
                                    currentPeriodStart: new Date(
                                        subscription.current_period_start *
                                            1000,
                                    ),
                                    currentPeriodEnd: new Date(
                                        subscription.current_period_end * 1000,
                                    ),
                                    updatedAt: new Date(),
                                },
                            },
                            { returnDocument: 'after' },
                        );

                    if (result) {
                        await db.collection('user').updateOne(
                            { _id: result.userId },
                            {
                                $set: {
                                    subscriptionPlan: 'premium',
                                    updatedAt: new Date(),
                                },
                            },
                        );
                    }
                }

                break;
            }

            case 'invoice.payment_failed': {
                console.log('Subscription payment failed');
                const invoice = event.data.object;

                const subscriptionId =
                    typeof invoice.subscription === 'string'
                        ? invoice.subscription
                        : invoice.subscription?.id;

                if (subscriptionId) {
                    await db.collection('subscriptions').updateOne(
                        { stripeSubscriptionId: subscriptionId },
                        {
                            $set: {
                                paymentStatus: 'failed',
                                updatedAt: new Date(),
                            },
                        },
                    );
                }

                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;

                await db.collection('subscriptions').updateOne(
                    {
                        stripeSubscriptionId: subscription.id,
                    },
                    {
                        $set: {
                            status: subscription.status,
                            cancelAtPeriodEnd:
                                subscription.cancel_at_period_end,
                            currentPeriodStart: new Date(
                                subscription.current_period_start * 1000,
                            ),
                            currentPeriodEnd: new Date(
                                subscription.current_period_end * 1000,
                            ),
                            updatedAt: new Date(),
                        },
                    },
                );

                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;

                const result = await db.collection('subscriptions').findOne({
                    stripeSubscriptionId: subscription.id,
                });

                if (result) {
                    await db.collection('subscriptions').updateOne(
                        { stripeSubscriptionId: subscription.id },
                        {
                            $set: {
                                status: 'canceled',
                                updatedAt: new Date(),
                            },
                        },
                    );

                    const anotherActiveSubscription = await db
                        .collection('subscriptions')
                        .findOne({
                            userId: result.userId,
                            status: 'active',
                            stripeSubscriptionId: { $ne: subscription.id },
                        });

                    if (!anotherActiveSubscription) {
                        await db.collection('user').updateOne(
                            {
                                _id: result.userId,
                                // শুধু পুরোনো subscription-এর user plan পরিবর্তন করবে না
                            },
                            {
                                $set: {
                                    subscriptionPlan: 'free',
                                    updatedAt: new Date(),
                                },
                            },
                        );
                    }
                }

                console.log('Subscription cancelled');

                break;
            }

            default:
                console.log(`Unhandled event: ${event.type}`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.log('Webhook processing error:', error);

        return res.status(500).json({
            success: false,
            message: 'Webhook processing failed',
        });
    }
};

export const paymentsController = {
    checkOutPayment,
    stripeWebhook,
};
