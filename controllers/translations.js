var Q = require("q");
var http = require('http');
var nodeRequest = require("request");
//require("request-debug")(nodeRequest);
var clientId = process.env.TRANS_ID;
var clientSecret = process.env.TRANS_SECRET;
var hipchatToken = process.env.HIPCHAT_TOKEN;
var queryString = require("querystring");
var parseString = require('xml2js').parseString;

function Translations(request, response){
	var message = request.body.item.message.message;
	var roomId = request.body.item.room.id;
	var notificationUrl = "https://www.hipchat.com/v2/room/"+ roomId + "/notification?auth_token=" + hipchatToken;
	var text = getTextFromMessage(message);
	var tokenPromise = getApiToken(clientSecret, clientId);
	var respondWith = {
		"from": "TranslationBot",
		"message": '',
		"color": "gray",
		"message_format": "html"
	};
  
  var deferredTranslation = function(token){
    translateText(text, token).then(function(result){
      respondWith.message = result;
      response.json(respondWith);
      //User roomid == "test" to test this on a local machine.
      if (roomId !== "test") {
		  nodeRequest.post({url: notificationUrl, json: respondWith}, function(err, response){
			  if (err){
				  console.log("Error communicating with the HipChat API. ", err);
			  } else {
				  console.log(response.statusCode + " received from HipChat notification URL.");
			  }
		  });
	  } else {
          console.log(result);
      }
    });
  }
  tokenPromise.then(deferredTranslation);
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
  }
  //console.log(body)
  nodeRequest.post({url: url, form: body}, function(err, httpResponse, body) {
    body = JSON.parse(body)
    //console.log(body.access_token);
    deferred.resolve(body.access_token);
  });

  return deferred.promise;
}
function translateText(text, accessToken){
	var deferred = Q.defer();
  
  var url = "http://api.microsofttranslator.com/v2/Http.svc/Translate"
	var from = 'en'
  var to = 'vi'
  var data = {
    from: from,
    to: to,
    text: text
  }
  url += "?" + queryString.stringify(data);
  var headers = {
    'Authorization': "Bearer " + accessToken
  }
  
  var options = {
    url: url,
    headers: headers,
    method: "GET",

  }

  var req = nodeRequest(options, function(error, res, body){
    var body = res.body
    parseString(body, function(err, result){
      deferred.resolve(result.string._);
    });  
 });

  return deferred.promise;
}
