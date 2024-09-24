// 404 handler
const notFound = (req, res, next) => {
    const error = new Error(`NOT FOUND - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Middleware error handler
const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    res.status(error.status || 500).json({ message: error.message || "An unknown error occurred" });
};

module.exports = { notFound, errorHandler };
