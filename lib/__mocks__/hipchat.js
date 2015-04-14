"use strict";
var sendMessage = jest.genMockFunction();
var hipchat = require.requireActual('../hipchat');
module.exports = function(reset){
    if (reset) {
        sendMessage.mockClear();
    }
    return {
        sendMessage: sendMessage,
        tokenizeMessage: hipchat().tokenizeMessage
    };
}