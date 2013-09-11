var dazzle = require("../external/dazzle-node");
var BigNum = require("bignumber.js");
var Q = require("q");
var heroes = require("../data/heroes");
var items = require("../data/items");
var apiKey = process.env.STEAM_API_KEY;
var dota2Api = new dazzle.dota(apiKey);
var steamApi = new dazzle.steam(apiKey);
var templateName = "dota2Message";
function Dota2Chat(request, response){
	var message = messageParameters(request.body.payload && JSON.parse(request.body.payload).message);
	var respondWith = {
		"from": "DotaChat",
		"message": '',
		"color": "gray",
		"message_format": "html"
	}
	//if there was a payload message, use that, otherwise look for a query parameter.
	var username = getAccountFromMessage(message.account || request.query.id);
	getSteamId(username).then(function (steamId) {
		//convert steamId into accountId https://developer.valvesoftware.com/wiki/SteamID
		var accountId = +(new BigNum(steamId)).minus("76561197960265728").toString();
		var playerInfo = getPlayerInfo(steamId);
		var matchDetails = getNthMatch(accountId, message.offset)
			.get('match_id')
			.then(getMatchDetails);
		Q.all([matchDetails, playerInfo])
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
						templateData.player.assists = player.assists;
						templateData.player.gpm = player.gold_per_min;
						templateData.player.xpm = player.xp_per_min;
					}
				}
				templateData.matchId = matchDetails.match_id;
				templateData.victory = radiant === matchDetails.radiant_win;
				respondWith.color = templateData.victory ? 'green' : 'red';
				response.render(templateName, templateData, function(err, message){
					//console.log('template rendered', err, message);
					respondWith.message = message;
					//console.log(respondWith);
					response.json(respondWith);
				});
			})
			.catch(function(errorMessage){
				respondWith.message = "Error on: " + message + "<br/>" + errorMessage;
				respondWith.color = 'yellow';
				response.json(respondWith);
			});
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
	return account;
}
function messageParameters(message) {
	var offset = message.indexOf("^");
	if (!message || offset === -1) {
		return {account: message};
	}
	return {
		account: message.substring(0, offset),
		offset: message.substring(offset+1)
	}
}
function statusCheck(response) {
	return response && response.status !== 1;
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
function getNthMatch(accountId, n) {
	var deferred = Q.defer();
	var n = n ? +n : 0;
	if (!accountId) {
		deferred.reject('Account for that user could not be found.');
	}
	console.log("getting match: ", n, " for account id: ", accountId);
	dota2Api.getMatchHistory({account_id: accountId, matches_requested: n+1}, function(err, apiResponse){
		if (statusCheck(apiResponse)) {
			deferred.reject(apiResponse.statusDetail);
		} else {
 			deferred.resolve(apiResponse.matches[n]);
		}
	});
	return deferred.promise;
}
function getSteamId(username) {
	var deferred = Q.defer();
	steamApi.getSteamId(username, function (err, apiResponse) {
		if (apiResponse.success === 1) {
			deferred.resolve(apiResponse.steamid);
		} else {
			deferred.reject(apiResponse.message);
		}
	});
	return deferred.promise;
}
