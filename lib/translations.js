var Q = require("q");
var nodeRequest = require("request");
var clientId = process.env.TRANS_ID;
var clientSecret = process.env.TRANS_SECRET;
var queryString = require("querystring");
var parseString = require('xml2js').parseString;

function Translations(message){
    var text = getTextFromMessage(message);
    var respondWith = {
        "message": '',
        "color": "gray"
    };

    return getApiToken(clientSecret, clientId).then(function(token){
        return translateText(text, token)
    }).then(function(result){
        respondWith.message = result;
        return respondWith;
    }, function(){
        return "There was an error getting a translation.";
    });
}

module.exports = Translations;

function getTextFromMessage(message) {
    var text = message;
    if (text.indexOf(' ') !== -1) {
        text = text.substring(text.indexOf(' ')+1);
    }
    return text;
}
function getApiToken(secret, id){
    var deferred = Q.defer();
    var url = "https://datamarket.accesscontrol.windows.net/v2/OAuth2-13"
    var body = {
        client_id: id,
        client_secret: secret,
        scope: "http://api.microsofttranslator.com/",
        grant_type: "client_credentials"
    };

    nodeRequest.post({url: url, form: body}, function(err, httpResponse, body) {
        body = JSON.parse(body);
        //console.log(body.access_token);
        deferred.resolve(body.access_token);
    });

    return deferred.promise;
}
function translateText(text, accessToken){
    var from = 'en';
    var to = 'vi';
    var data = {
        from: from,
        to: to,
        text: text
    };
    var url = "http://api.microsofttranslator.com/v2/Http.svc/Translate?" + queryString.stringify(data);
    var headers = {
        'Authorization': "Bearer " + accessToken
    };

    var options = {
        url: url,
        headers: headers,
        method: "GET"
    };

    return Q.nfcall(nodeRequest, options).then(function(result){
        parseString(result.body, function(err, result){
            return result.string._;
        });
    });
}
