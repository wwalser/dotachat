var Q = require('q');
var dota2 = require('../lib/dota2');

module.exports = function(request, response) {
    var templateRenderer = Q.nbind(response.render, response);
    var message = request.body.full;

    dota2(message, templateRenderer).then(function(messageObject){
        try {
            response.json(messageObject);
        } catch (e) {
            console.log('uh oh', e);
        }
    });
};