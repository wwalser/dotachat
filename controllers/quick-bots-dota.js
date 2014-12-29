var Q = require('q');
var dota2 = require('../lib/dota2');
var quickBots = require('../lib/quick-bots');

module.exports = function(request, response) {
    var templateRenderer = Q.nbind(response.render, response);
    var message = request.body.full;

    quickBots.timed(dota2(message, templateRenderer), 'The Steam API is slow right now.').then(function(messageObject){
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