import { db } from '../db/mongodb.js';

const getAllUsers = async (req, res) => {
    try {
        // // 1. Get logged-in user
        // const user = req.user;

        // // 2. Check authentication
        // if (!user) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Unauthorized access',
        //     });
        // }

        // // 3. Check admin role
        // if (user.role !== 'admin') {
        //     return res.status(403).json({
        //         success: false,
        //         message: 'Forbidden: Admin access required',
        //     });
        // }

        // 4. Fetch all users
        const users = await db
            .collection('user')
            .find(
                {},
                {
                    projection: {
                        passwordHash: 0,
                    },
                },
            )
            .sort({ createdAt: -1 })
            .toArray();

        // 5. Format response
        const formattedUsers = users.map((item) => ({
            _id: String(item._id),
            name: String(item.name ?? ''),
            email: String(item.email ?? ''),
            image: typeof item.image === 'string' ? item.image : '',
            role: item.role ?? 'user',
            plan: item.subscriptionPlan ?? item.plan ?? 'free',
            createdAt: item.createdAt
                ? new Date(item.createdAt).toISOString()
                : null,
        }));

        return res.status(200).json({
            success: true,
            message: 'Users fetched successfully.',
            data: formattedUsers,
        });
    } catch (error) {
        console.error('Get admin users error:', error);

        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
        });
    }
};

export const userController = {
    getAllUsers,
};
