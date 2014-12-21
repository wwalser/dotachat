var Q = require('q');
var tomato = require('../lib/tomato');

module.exports = function(request, response) {
    var templateRenderer = Q.nbind(response.render, response);
    var message = request.body.full;

    tomato(message, templateRenderer).then(function(messageObject){
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