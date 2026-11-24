import { env } from '../../config/env';
import { stripe } from '../../config/strip.js';
import { db } from '../db/mongodb';
import { ObjectId } from 'mongodb';

const checkOutPayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const role = req.user.role;

        // Role validation
        const priceId = {
            student: process.env.STRIPE_STUDENT_PRICE_ID,
            tutor: process.env.STRIPE_TUTOR_PRICE_ID,
        };
        if (!priceId[role]) {
            return res.status(403).json({
                success: false,
                message: 'Invalid subscription role',
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',

            line_items: [
                {
                    price: priceId[role],
                    quantity: 1,
                },
            ],

            metadata: {
                userId: userId.toString(),
                role: role,
            },

            success_url: `${process.env.CLIENT_URL}/premium/success`,

            cancel_url: `${process.env.CLIENT_URL}/premium/cancel`,
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
