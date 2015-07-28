var Q = require("q");
var nodeRequest = require("request");
var clientId = process.env.TRANS_ID;
var clientSecret = process.env.TRANS_SECRET;
var queryString = require("querystring");
var parseString = require("xml2js").parseString;

function getTextFromMessage(message) {
    var text = message;
    if (text.indexOf(" ") !== -1) {
        text = text.substring(text.indexOf(" ") + 1);
    }
    return text;
}
function getApiToken(secret, id){
    var deferred = Q.defer();
    var url = "https://datamarket.accesscontrol.windows.net/v2/OAuth2-13";
    var body = {
        client_id: id, // eslint-disable-line camelcase
        client_secret: secret, // eslint-disable-line camelcase
        scope: "http://api.microsofttranslator.com/",
        grant_type: "client_credentials" // eslint-disable-line camelcase
    };

    nodeRequest.post({url: url, form: body}, function(err, httpResponse, responseBody) {
      if (err) {
        console.log("API token retrieval failed.");
        return;
      }
      var parsedBody = JSON.parse(responseBody);
      if (parsedBody.access_token) {
        console.log("Translation access token granted.");
        deferred.resolve(parsedBody.access_token);
      } else {
        console.log("Translation access token failure.");
        deferred.reject("Problem getting API token.");
      }
    });

    return deferred.promise;
}
function translateText(text, accessToken){
    var from = "en";
    var to = "vi";
    var data = {
        from: from,
        to: to,
        text: text
    };
    var url = "http://api.microsofttranslator.com/v2/Http.svc/Translate?" + queryString.stringify(data);
    var headers = {
        "Authorization": "Bearer " + accessToken
    };

    var options = {
        url: url,
        headers: headers,
        method: "GET"
    };

    //Call API and parse XML result.
    return Q.nfcall(nodeRequest, options)
        .get("1")
        .then(Q.nfbind(parseString))
        .get("string").get("_");
}

function Translations(message){
    var text = getTextFromMessage(message);
    var respondWith = {
        "message": "",
        "color": "gray"
    };

    return getApiToken(clientSecret, clientId)
        .then(Q.fbind(translateText, text))
        .then(function(result){
            respondWith.message = result;
            return respondWith;
        }, function(){
            return "There was an error getting a translation.";
        });
}

module.exports = Translations;