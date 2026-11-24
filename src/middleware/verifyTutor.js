export const verifyTutor = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access',
            });
        }

        if (req.user.role.toLowerCase() !== 'tutor') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Access denied',
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
