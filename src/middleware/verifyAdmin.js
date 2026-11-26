export const verifyAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized access',
            });
        }

        if (req.user.role.toLowerCase() !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only students can apply for tuition',
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
