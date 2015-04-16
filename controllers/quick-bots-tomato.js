var tomato = require('../lib/tomato');

module.exports = function(request, response) {
    var message = request.body.item.message.message || request.body.text;

    tomato(message).then(function(messageObject){
        try {
            response.json(messageObject);
        } catch (e) {
            console.log('uh oh', e);
        }
    }, function(messageObject){
        console.log("Letting quick-bots know there was trouble.")
        response.json(messageObject)
    });
};