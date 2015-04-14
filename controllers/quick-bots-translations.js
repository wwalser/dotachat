var translations = require('../lib/translations');

module.exports = function(request, response) {
    var message = request.body.message.message || request.body.text;
    console.log("Translating: " + message);

    translations(message).then(function(messageObject){
        try {
            response.json(messageObject);
        } catch (e) {
            console.log('A problem sending the response from translation bot.', e);
        }
    }, function(messageObject){
        console.log("Letting quick-bots know there was trouble.")
        response.json(messageObject)
    });
};