//Used to make dev mode a little nicer for AC-Express
//Stubs out data commonly provided by HipChat while in dev mode so that things can be tested.
var ac = require('atlassian-connect-express');

function devModeAuthenticate(){
    return function (req, res, next){
        req.clientInfo = {
            clientKey: 1234
        };
        req.context = {
            item: {
                message: {message: "/dota wes^1"},
                room: {id: 1337}
            }
        }
        next();
    }
};

ac.devMode = function(addon){
    addon.authenticate = devModeAuthenticate;
}

module.exports = ac;