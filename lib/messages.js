"use strict";
module.exports = function(req){
    var message;
    if (req.query.message) {
        message = {
            type: req.query.type,
            message: req.query.message,
            title: req.query.type === 'error' ? 'Failure' : 'Success'
        };
    }
    return message;
};