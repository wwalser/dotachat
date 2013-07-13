var dazzle = require("../external/dazzle-node");
var BigNum = require("bignumber.js");
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
var dota2Api = new dazzle.dota(apiKey);
var steamApi = new dazzle.steam(apiKey);
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
	//convert accountId into a steamId https://developer.valvesoftware.com/wiki/SteamID
	var steamId = (new BigNum(accountId)).plus("76561197960265728").toString();
	var playerInfo = getPlayerInfo(steamId);
	var firstMatchDetails = getFirstMatch(accountId)
		.get('match_id')
		.then(getMatchDetails);
	Q.all([firstMatchDetails, playerInfo])
		.spread(function(matchDetails, playerInfo){
			var radiant;
			var victory;
			console.log('playerInfo: ', playerInfo.personaname);
			for (var player in matchDetails.players) {
				player = matchDetails.players[player];
				if (player.account_id === accountId) {
					radiant = player.player_slot < 100;
				}
			}
			victory = radiant === matchDetails.radiant_win;
			respondWith.message = playerInfo.personaname;
			respondWith.message += victory ? "'s most recent match was a victory." : "'s most recent match was a loss";
			respondWith.color = victory ? 'green' : 'red';
			response.json(respondWith);
		})
		.catch(function(errorMessage){
			respondWith.message = errorMessage;
			respondWith.color = 'yellow';
			response.json(respondWith);
		});
};

function getPlayerInfo(accountId) {
	var deferred = Q.defer();
	steamApi.getPlayerSummaries(accountId, function(err, apiResponse){
		deferred.resolve(apiResponse.players[0]);
	});
	return deferred.promise;
}
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
	dota2Api.getMatchDetails(matchId, function(err, apiResponse){
		deferred.resolve(apiResponse);
	});
	return deferred.promise;
}
function getFirstMatch(accountId, next, error) {
	var deferred = Q.defer();
	if (!accountId) {
		deferred.reject('Account for that user could not be found.');
	}
	dota2Api.getMatchHistory({account_id: accountId, matches_requested: 1}, function(err, apiResponse){
		if (statusCheck(apiResponse)) {
			deferred.reject(apiResponse.statusDetail);
		} else {
 			deferred.resolve(apiResponse.matches[0]);
		}
	});
	return deferred.promise;
}