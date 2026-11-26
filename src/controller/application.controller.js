import { ObjectId } from 'mongodb';
import { db } from '../db/mongodb.js';

// 1. Create Application (only student Apply)
const createApplication = async (req, res) => {
    try {
        const {
            tuitionId,
            tutorEmail,
            studentName,
            studentEmail,
            studentPhone,
            preferredSchedule,
            studentNote,
        } = req.body;

        // Required field validation
        if (!tuitionId || !tutorEmail || !studentEmail || !studentPhone) {
            return res.status(400).json({
                success: false,
                message: 'Required fields are missing',
            });
        }

        // Check tuition exists
        if (!ObjectId.isValid(tuitionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid tuition ID',
            });
        }

        const tuition = await db.collection('tuitions').findOne({
            _id: new ObjectId(tuitionId),
            approvalStatus: 'approved',
            isActive: true,
        });

        if (!tuition) {
            return res.status(404).json({
                success: false,
                message: 'Tuition not found or unavailable',
            });
        }

        // Check student subscription
        const student = await db.collection('user').findOne({
            _id: new ObjectId(req.user.id),
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        // Free student monthly application limit
        if (student.subscriptionPlan === 'free') {
            const now = new Date();

            // Current month start
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Next month start
            const startOfNextMonth = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                1,
            );

            const totalApplications = await db
                .collection('applications')
                .countDocuments({
                    studentEmail: studentEmail,
                    appliedAt: {
                        $gte: startOfMonth,
                        $lt: startOfNextMonth,
                    },
                });

            if (totalApplications >= 2) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Free plan allows only 2 applications per month. Upgrade to Premium for unlimited applications.',
                });
            }
        }
        // Prevent duplicate application
        const existingApplication = await db
            .collection('applications')
            .findOne({
                tuitionId: new ObjectId(tuitionId),
                studentEmail,
            });

        if (existingApplication) {
            return res.status(409).json({
                success: false,
                message: 'You have already applied for this tuition',
            });
        }

        const applicationData = {
            tuitionId: new ObjectId(tuitionId),
            tuitionTitle: tuition.title,
            subject: tuition.subject,
            monthlyFee: tuition.monthlyFee,
            tutorEmail: tuition.tutorEmail,
            tutorName: tuition.tutorName,

            studentId: req.user?.id || null,
            studentName,
            studentEmail,
            studentPhone,
            preferredSchedule: preferredSchedule || '',
            studentNote: studentNote || '',

            status: 'pending',
            appliedAt: new Date(),
        };

        const result = await db
            .collection('applications')
            .insertOne(applicationData);

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: {
                _id: result.insertedId,
                ...applicationData,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// 2. Get My Applications (Student)
const getMyApplications = async (req, res) => {
    try {
        const studentEmail = req.user?.email;

        if (!studentEmail) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized user',
            });
        }

        const result = await db
            .collection('applications')
            .find({ studentEmail })
            .sort({ appliedAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            message: 'My applications retrieved successfully',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get My APplications (tutor)
const getTutorApplications = async (req, res) => {
    try {
        const tutorEmail = req.user?.email;

        if (!tutorEmail) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized user',
            });
        }

        const result = await db
            .collection('applications')
            .find({ tutorEmail })
            .sort({ appliedAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            message: 'Tutor applications retrieved successfully',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// 3. Get All Applications (Admin)
const getAllApplications = async (req, res) => {
    try {
        const result = await db
            .collection('applications')
            .find({})
            .sort({ appliedAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            message: 'All applications retrieved successfully',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// 4. Get Single Application
const getApplicationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application ID',
            });
        }

        const result = await db.collection('applications').findOne({
            _id: new ObjectId(id),
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Application not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Application retrieved successfully',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// 5. Update Application Status Accepted or Rejected (Tutor)
const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatus = ['accepted', 'rejected'];

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application ID',
            });
        }

        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be accepted or rejected',
            });
        }

        const application = await db.collection('applications').findOne({
            _id: new ObjectId(id),
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found',
            });
        }

        // Only the owner tutor can update application
        if (application.tutorEmail !== req.user?.email) {
            return res.status(403).json({
                success: false,
                message: 'You cannot update this application',
            });
        }

        const result = await db.collection('applications').updateOne(
            {
                _id: new ObjectId(id),
                tutorEmail: req.user.email,
            },
            {
                $set: {
                    status,
                    updatedAt: new Date(),
                },
            },
        );

        if (result.matchedCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'Application could not be updated.',
            });
        }

        res.status(200).json({
            success: true,
            message: `Application ${status} successfully`,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// 6. Delete Application (Student)
const deleteApplication = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid application ID',
            });
        }

        const application = await db.collection('applications').findOne({
            _id: new ObjectId(id),
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found',
            });
        }

        // Only owner student can delete
        if (application.studentEmail !== req.user?.email) {
            return res.status(403).json({
                success: false,
                message: 'You cannot delete this application',
            });
        }

        // Only pending application can be deleted
        if (application.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending applications can be cancelled',
            });
        }

        const result = await db.collection('applications').deleteOne({
            _id: new ObjectId(id),
            studentEmail: req.user.email,
            status: 'pending',
        });

        res.status(200).json({
            success: true,
            message: 'Application cancelled successfully',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const applicationController = {
    createApplication,
    getMyApplications,
    getTutorApplications,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus,
    deleteApplication,
};
