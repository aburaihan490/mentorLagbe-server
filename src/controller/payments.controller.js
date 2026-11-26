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
            userEmail: userEmail,
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

                // console.log('Checkout completed:', session.id);

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

                // console.log('Subscription activated successfully');

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
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// get payment subscription
const getStudentPayments = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId || !ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID',
            });
        }

        const subscriptions = await db
            .collection('subscriptions')
            .find({
                userId: new ObjectId(userId),
                role: 'student',
            })
            .sort({ createdAt: -1 })
            .toArray();

        const totalPaid = subscriptions
            .filter((item) => item.paymentStatus === 'paid')
            .reduce((total, item) => total + item.amount, 0);

        const pendingPayments = subscriptions
            .filter((item) => item.paymentStatus === 'pending')
            .reduce((total, item) => total + item.amount, 0);

        const now = new Date();

        const thisMonth = subscriptions
            .filter((item) => {
                const date = new Date(item.createdAt);

                return (
                    item.paymentStatus === 'paid' &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()
                );
            })
            .reduce((total, item) => total + item.amount, 0);

        return res.status(200).json({
            success: true,
            summary: {
                totalPaid,
                pendingPayments,
                thisMonth,
            },
            payments: subscriptions,
        });
    } catch (error) {
        console.error('Get Student Payments Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payments',
        });
    }
};

// get all Transaction payment for Admin
const getAllTransactions = async (req, res) => {
    try {
        // Only Admin can access
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.',
            });
        }

        const subscriptions = db.collection('subscriptions');

        const transactions = await subscriptions
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        const totalTransactions = transactions.length;

        const paidTransactions = transactions.filter(
            (item) => item.paymentStatus === 'paid',
        );

        const pendingTransactions = transactions.filter(
            (item) => item.paymentStatus === 'pending',
        );

        // Stripe amount is normally stored in cents
        const totalRevenue = paidTransactions.reduce(
            (total, item) => total + (item.amount || 0),
            0,
        );

        const pendingAmount = pendingTransactions.reduce(
            (total, item) => total + (item.amount || 0),
            0,
        );

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const thisMonthRevenue = paidTransactions
            .filter((item) => {
                const date = new Date(item.createdAt);

                return (
                    date.getMonth() === currentMonth &&
                    date.getFullYear() === currentYear
                );
            })
            .reduce((total, item) => total + (item.amount || 0), 0);

        res.status(200).json({
            success: true,
            message: 'Transactions fetched successfully',

            stats: {
                totalRevenue: totalRevenue / 100,
                totalTransactions,
                pendingPayments: pendingTransactions.length,
                pendingAmount: pendingAmount / 100,
                thisMonth: thisMonthRevenue / 100,
            },

            data: transactions.map((item) => ({
                ...item,
                amount: item.amount / 100,
            })),
        });
    } catch (error) {
        console.error('Get All Transactions Error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
        });
    }
};

export const paymentsController = {
    checkOutPayment,
    stripeWebhook,
    getStudentPayments,
    getAllTransactions,
};
