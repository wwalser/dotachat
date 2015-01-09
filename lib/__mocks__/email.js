module.exports = function(){
    return {
        sendBotCreatedEmail: jest.genMockFn(),
        sendBotUrlReminder: jest.genMockFn()
    };
};