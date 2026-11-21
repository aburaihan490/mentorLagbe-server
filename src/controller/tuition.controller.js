import { ObjectId } from 'mongodb';
import { db } from '../db/mongodb.js';

// create tuitions post api
const createTuitions = async (req, res) => {
    try {
        const response = req.body;

        const result = await db.collection('tuitions').insertOne(response);

        res.status(201).json({
            success: true,
            message: 'Tuition created successfully',
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// get All tution api
const getAllTuitions = async (req, res) => {
    try {
        const { search, subject, class: classLevel, mode } = req.query;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 6);
        const skip = (page - 1) * limit;
        const filter = {
            approvalStatus: 'approved',
            isActive: true,
        };

        // Search filter
        if (search) {
            filter.title = {
                $regex: search,
                $options: 'i',
            };
        }

        // Subject filter
        if (subject) {
            filter.subject = { $regex: subject, $options: 'i' };
        }

        // Class filter
        if (classLevel) {
            filter.classLevel = { $regex: classLevel, $options: 'i' };
        }

        // Mode filter
        if (mode) {
            filter.mode = mode;
        }

        const [data, total] = await Promise.all([
            db
                .collection('tuitions')
                .find(filter)
                .skip(skip)
                .limit(limit)
                .toArray(),

            db.collection('tuitions').countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            success: true,
            message: 'Tuitions fetched successfully',
            data: data,
            pagination: {
                currentPage: page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const singleTuition = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid book ID' });
        }

        const result = await db
            .collection('tuitions')
            .findOne({ _id: new ObjectId(id) });

        if (!result) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Tuition fetch successfully',
            data: result,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

export const tutionController = {
    createTuitions,
    getAllTuitions,
    singleTuition,
};
