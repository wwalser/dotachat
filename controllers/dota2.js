var dazzle = require("../external/dazzle-node");
var BigNum = require("bignumber.js");
var nodeRequest = require("request");
var Q = require("q");
var http = require('http');
var people = require("../data/people");
var heroes = require("../data/heroes");
var items = require("../data/items");
var apiKey = process.env.STEAM_API_KEY;
var hipchatToken = process.env.HIPCHAT_TOKEN;
var dota2Api = new dazzle.dota(apiKey);
var steamApi = new dazzle.steam(apiKey);
var templateName = "dota2Message";
function Dota2Chat(request, response){
	var message = messageParameters(request.body.item.message.message);
	var roomId = request.body.item.room.id;
	var respondWith = {
		"from": "DotaChat",
		"message": '',
		"color": "gray",
		"message_format": "html"
	}
	//if there was a payload message, use that, otherwise look for a query parameter.
	getAccountFromMessage(message.account || request.query.id).spread(function (steamId, accountId){
		//convert steamId into accountId https://developer.valvesoftware.com/wiki/SteamID
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
					console.log('template rendered', err, message);
					respondWith.message = message;
					console.log(respondWith);
					response.json(respondWith);
					var notificationUrl = "https://www.hipchat.com/v2/room/"+ roomId + "/notification?auth_token=" + hipchatToken;
					//User roomid == "test" to test this on a local machine.
					if (roomId !== "test") {
						nodeRequest.post({url: notificationUrl, json: respondWith}, function(err, response, body){
							if (err) {
								console.log("Error when sending notification to HipChat. ", err);
							} else {
								console.log(response.statusCode + " from HipChat.");
							}
						});
					}
				});
			})
			.catch(function(errorMessage){
				console.log("Failed to get match details or player info.", username, errorMessage);
				respondWith.message = "Error on: " + username + "<br/>" + errorMessage;
				respondWith.color = 'yellow';
				return respondWith;
			});
	}).catch(function(errorMessage){
		console.log("Failed to get account details from message.");
		respondWith.message = "Error on: " + username + "<br/>" + errorMessage + "<br/>Are you sure that is the correct vanity URL?";
		respondWith.color = 'yellow';
		return respondWith;
	});
}
// Export Dota2Chat.
module.exports = Dota2Chat;

function statusCheck(response) {
	return response && response.status !== 1;
}
function getPlayerInfo(accountId) {
	console.log("getting player info for: ", accountId);
	var deferred = Q.defer();
	steamApi.getPlayerSummaries(accountId, function(err, apiResponse){
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(apiResponse.players[0]);
		}
	});
	return deferred.promise;
}
//message can contain either a userID or a user name.
function getAccountFromMessage(message) {
	var account = message;
	if (account.indexOf(' ') !== -1) {
		account = account.split(' ')[1];
	}
	//did the message provide an integer? If so it's probably an accountId
	if (!+account && people[account.toLowerCase()]) {
		console.log('Attempting to find in local people list: ', account);
		account = people[account.toLowerCase()];
	} else {
		console.log('Account provided appears to be an integer: ', account);
	}
	return getIds(account);
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
	console.log("getting match details for: ", matchId);
	var deferred = Q.defer();
	dota2Api.getMatchDetails(matchId, function(err, apiResponse){
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(apiResponse);
		}
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
		if (err) {
			deferred.reject(err);
		} else if (statusCheck(apiResponse)) {
			deferred.reject(apiResponse.statusDetail);
		} else {
 			deferred.resolve(apiResponse.matches[n]);
		}
	});
	return deferred.promise;
}
/**
 * Returns a promise for [steamId, accountId].
 */
function getIds(username) {
	var deferred = Q.defer();
	var accountId, steamId;
	//If we can get a number now it's probably a dotaid
	if (+username) {
		accountId = +username;
		steamId = (new BigNum(accountId)).plus("76561197960265728").toString();
		deferred.resolve([steamId, accountId]);
	} else {
		steamApi.getSteamId(username, function (err, apiResponse) {
			if (err) {
				deferred.reject(err);
			} else if (apiResponse.success === 1) {
				steamId = apiResponse.steamid;
				accountId = +(new BigNum(steamId).minus("76561197960265728").toString());
				deferred.resolve([steamId, accountId]);
			} else {
				deferred.reject(apiResponse.message);
			}
		});
	}
	return deferred.promise;
}
