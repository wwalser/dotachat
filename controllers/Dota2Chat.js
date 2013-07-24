var dazzle = require("../external/dazzle-node");
var BigNum = require("bignumber.js");
var Q = require("q");
var people = require("../data/people");
var heroes = require("../data/heroes");
var items = require("../data/items");
var apiKey = process.env.STEAM_API_KEY;
var dota2Api = new dazzle.dota(apiKey);
var steamApi = new dazzle.steam(apiKey);
var templateName = "dota2Message";
var playerDetailMessage = "<br>{0} played {1} and went {2}/{3}";
function Dota2Chat(request, response){
	var message = request.body.payload && JSON.parse(request.body.payload).message;
	var respondWith = {
		"from": "DotaChat",
		"message": '',
		"color": "gray",
		"message_format": "html"
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
			var templateData = {
				player: {
					name: playerInfo.personaname,
					avatar: playerInfo.avatar
				}
			};
			for (var player in matchDetails.players) {
				player = matchDetails.players[player];
				if (player.account_id === accountId) {
					radiant = player.player_slot < 100;
					templateData.player.hero = heroes[player.hero_id];
					templateData.player.items = extractItems(player);
					templateData.player.kills = player.kills;
					templateData.player.deaths = player.deaths;
				}
			}
			templateData.matchId = matchDetails.match_id;
			templateData.victory = radiant === matchDetails.radiant_win;
			respondWith.color = templateData.victory ? 'green' : 'red';
			response.render(templateName, templateData, function(err, message){
				console.log('template rendered', err, message);
				respondWith.message = message;
				//console.log(respondWith);
				response.json(respondWith);
			});
		})
		.catch(function(errorMessage){
			respondWith.message = errorMessage;
			respondWith.color = 'yellow';
			response.json(respondWith);
		});
}
// Export Dota2Chat.
module.exports = Dota2Chat;

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
function extractItems(player) {
	var playerItems = [], item;
	for (var i = 0; i <= 5; i++) {
		item = +player['item_' + i];
		if (item !== 0) {
			playerItems.push(items[item]);
		}
	}
	return playerItems;
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

