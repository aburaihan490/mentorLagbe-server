import { ObjectId } from 'mongodb';
import { db } from '../db/mongodb.js';

// create tuitions post api (only tutor)
const createTuitions = async (req, res) => {
    try {
        const {
            title,
            subject,
            classLevel,
            mode,
            location,
            monthlyFee,
            daysPerWeek,
            description,
            bannerImage,
        } = req.body;

        if (
            !title ||
            !subject ||
            !classLevel ||
            !mode ||
            !location ||
            !monthlyFee ||
            !daysPerWeek ||
            !description ||
            !bannerImage
        ) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
            });
        }
        const user = await db.collection('user').findOne({
            email: req.user.email,
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.role !== 'tutor') {
            return res.status(403).json({
                success: false,
                message: 'Only tutors can post tuition',
            });
        }

        if (user.subscriptionPlan === 'free') {
            const now = new Date();

            // Current month's start date
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            // Current month's end date
            const startOfNextMonth = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                1,
            );
            const totalTuitions = await db
                .collection('tuitions')
                .countDocuments({
                    tutorEmail: user.email,
                    createdAt: {
                        $gte: startOfMonth,
                        $lt: startOfNextMonth,
                    },
                });

            if (totalTuitions >= 2) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Free plan allows only 2 tuition posts per month. Upgrade to Pro.',
                });
            }
        }

        const tuitionData = {
            title,
            subject,
            classLevel,
            mode,
            location,
            monthlyFee: Number(monthlyFee),
            daysPerWeek: Number(daysPerWeek),
            description,
            bannerImage,

            tutorName: req.user.name,
            tutorEmail: req.user.email,

            approvalStatus: 'pending',
            isActive: true,

            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection('tuitions').insertOne(tuitionData);

        return res.status(201).json({
            success: true,
            message: 'Tuition created successfully',
            data: {
                _id: result.insertedId,
                ...tuitionData,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get tutor's own tuitions
const getTutorTuitions = async (req, res) => {
    try {
        const tuitions = await db
            .collection('tuitions')
            .find({
                tutorEmail: req.user.email.trim().toLowerCase(),
            })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({
            success: true,
            message: 'Your tuitions fetched successfully',
            data: tuitions,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Edit only tutor tuitions
const updateTuitions = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            title,
            subject,
            classLevel,
            mode,
            location,
            monthlyFee,
            daysPerWeek,
            description,
            bannerImage,
        } = req.body;

        if (
            !title ||
            !subject ||
            !classLevel ||
            !mode ||
            !location ||
            !monthlyFee ||
            !daysPerWeek ||
            !description ||
            !bannerImage
        ) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
            });
        }

        const tuition = await db.collection('tuitions').findOne({
            _id: new ObjectId(id),
            tutorEmail: req.user.email,
        });

        if (!tuition) {
            return res.status(404).json({
                success: false,
                message: 'Tuition not found or you are not authorized',
            });
        }

        const updateData = {
            title,
            subject,
            classLevel,
            mode,
            location,
            monthlyFee: Number(monthlyFee),
            daysPerWeek: Number(daysPerWeek),
            description,
            bannerImage,
            updatedAt: new Date(),
        };

        const result = await db.collection('tuitions').updateOne(
            {
                _id: new ObjectId(id),
                tutorEmail: req.user.email,
            },
            {
                $set: updateData,
            },
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'No changes were made',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Tuition updated successfully',
            data: {
                _id: new ObjectId(id),
                ...tuition,
                ...updateData,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// isActive true or false toggle It's mean tuituin on of
const toggleTuition = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tuition ID',
            });
        }

        const tuition = await db.collection('tuitions').findOne({
            _id: new ObjectId(id),
            tutorEmail: req.user.email,
        });

        if (!tuition) {
            return res.status(404).json({
                success: false,
                message: 'Tuition not found',
            });
        }

        if (tuition.approvalStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Cannot change status before admin approval',
            });
        }

        const updatedTuition = await db.collection('tuitions').findOneAndUpdate(
            {
                _id: new ObjectId(id),
                tutorEmail: req.user.email,
            },
            {
                $set: {
                    isActive: !tuition.isActive,
                    updatedAt: new Date(),
                },
            },
            {
                returnDocument: 'after',
            },
        );

        return res.status(200).json({
            success: true,
            message: 'Tuition status updated successfully',
            data: updatedTuition,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// delete tuition (tutor only)
const deleteTuition = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tuition ID',
            });
        }

        const result = await db.collection('tuitions').deleteOne({
            _id: new ObjectId(id),
            tutorEmail: req.user.email,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tuition not found or you are not authorized',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Tuition deleted successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const tutorController = {
    createTuitions,
    getTutorTuitions,
    updateTuitions,
    toggleTuition,
    deleteTuition,
};
