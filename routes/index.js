var dazzle = require("dazzle");
var Q = require("q");
var apiKey = process.env.STEAM_API_KEY;
var people = {
	wes: 11686602,
	nukeem: 11686602,
	ig: 7684748,
	locked: 66024048,
	loco: 110649615,
	dvtng: 93817355,
	cyborg: 56575155
};
var api = new dazzle(apiKey);
/*
 * GET home page.
 */

exports.index = function(request, response) {
	var message = request.body.payload && JSON.parse(request.body.payload).message;
	var respondWith = {
		"from": "DotaChat",
		"message": '',
		"color": "gray",
		"message_format": "text"
	}
	//if there was a payload message, use that, otherwise look for a query parameter.
	var accountId = getAccountFromMessage(message ? message : request.query.id);
	getFirstMatch(accountId)
		.get('match_id')
		.then(getMatchDetails)
		.then(function(matchDetails){
			var radiant;
			var victory;
			for (var player in matchDetails.players) {
				player = matchDetails.players[player];
				if (player.account_id === accountId) {
					radiant = player.player_slot < 100;
				}
			}
			console.log(matchDetails, accountId, radiant, matchDetails.radiant_win);
			victory = radiant === matchDetails.radiant_win;
			respondWith.message = victory ? 'Player was victorious in their most recent match.' : 'Player was defeated in their most recent match.';
			respondWith.color = victory ? 'green' : 'red';
			response.json(respondWith);
		})
		.catch(function(errorMessage){
			respondWith.message = errorMessage;
			respondWith.color = 'yellow';
			response.json(respondWith);
		});
};

//message can contain either a userID or a user name.
function getAccountFromMessage(message) {
	var account = message;
	if (account.indexOf(' ') !== -1) {
		account = account.split(' ')[1];
	}
	if (!+account) {
		account = people[account.toLowerCase()];
	}
	return +account;
}
function statusCheck(response) {
	return response.status !== 1;
}
function getMatchDetails(matchId) {
	var deferred = Q.defer();
	api.getMatchDetails(matchId, function(err, apiResponse){
		deferred.resolve(apiResponse);
	});
	return deferred.promise;
}
function getFirstMatch(accountId, next, error) {
	var deferred = Q.defer();
	if (!accountId) {
		deferred.reject('Account for that user could not be found.');
	}
	api.getMatchHistory({account_id: accountId, matches_requested: 1}, function(err, apiResponse){
		if (statusCheck(apiResponse)) {
			deferred.reject(apiResponse.statusDetail);
		} else {
 			deferred.resolve(apiResponse.matches[0]);
		}
	});
	return deferred.promise;
}