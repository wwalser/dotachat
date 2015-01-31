"use strict";
module.exports = {
    post: jest.genMockFunction().mockImplementation(function(settings, callback){
        callback(false, {}, {message: 'super duper', color: 'green'});
    })
}