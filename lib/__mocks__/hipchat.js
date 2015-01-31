sendMessage = jest.genMockFunction();
module.exports = function(reset){
    if (reset) {
        sendMessage.mockClear();
    }
    return {
        sendMessage: sendMessage
    }
}