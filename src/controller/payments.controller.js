import { env } from '../../config/env.js';
import { stripe } from '../../config/strip.js';
// import { db } from '../db/mongodb';
// import { ObjectId } from 'mongodb';

const checkOutPayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const role = req.user.role;

        let amount;

        if (role === 'student') {
            amount = 1000; // $10
        } else if (role === 'tutor') {
            amount = 1500; // $15
        } else {
            throw new CoustomError('Invalid role', 400);
        }
        //  priceId[role]
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',

            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${role} Premium Subscription`,
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
                role: role,
            },

            success_url: `${env.CLIENT_URL}/premium/success`,

            cancel_url: `${env.CLIENT_URL}/premium/cancel`,
        });

        res.status(200).json({
            success: true,
            url: session.url,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Payment session creation failed',
        });
    }
};

export const paymentsController = {
    checkOutPayment,
};
