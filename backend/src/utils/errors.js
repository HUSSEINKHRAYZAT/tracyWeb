function notFound(req, res, next) {
    res.status(404).json({
        error: {
            message: 'Not found'
        }
    });
}

function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    const message = status === 500 ? 'Server error' : err.message;
    res.status(status).json({
        error: {
            message
        }
    });
}

module.exports = {
    notFound,
    errorHandler
};
