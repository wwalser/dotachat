var q = require("q");
var apiKey = process.env.STEAM_API_KEY || "redis://localhost:6379";
var heroes = require("../../data/heroes");
var items = require("../../data/items");
var dotaModel = require("./model");
var dazzle = require("../../external/dazzle-node");
var dota2Api = new dazzle.dota(apiKey); // eslint-disable-line new-cap
var steamApi = new dazzle.steam(apiKey); // eslint-disable-line new-cap
var BigNum = require("bignumber.js");

var helpers = {
	addPlayerDetails(message:tokenizedMessage) {
		return dotaModel.setDotaIdFromHipchatId(message.userId, message.addDotaId);
	},
	statusCheck(response) {
		return response && response.status !== 1;
	},
	getPlayerInfo(accountId) {
		console.log("getting player info for: ", accountId);
		var deferred = q.defer();
		steamApi.getPlayerSummaries(accountId, function(err, apiResponse){
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(apiResponse.players[0]);
			}
		});
		return deferred.promise;
	},
	//message can contain either a userID or a user name.
	getAccountFromMessage(userId:number) {
		return dotaModel
			.getDotaIdFromHipchatId(userId)
			.then(helpers.getIds);
	},
	messageParameters(message:hipchatMessage):tokenizedMessage {
		var tokenizedMessage = {
			account: "",
			userId: -1,
			mentionName: "",
			offset: 0,
			addDotaId: -1
		}
		var messageText = message.message;
		var userId = message.from.id;
		var mentionName = message.from.mention_name;
		var offset = messageText.indexOf("^");
		var add = messageText.indexOf(" add ");

		if (add !== -1) {
			tokenizedMessage.addDotaId = messageText.substring(add + 5);
		}

		if (offset !== -1) {
			tokenizedMessage.offset = messageText.substring(offset + 1)
		}

		tokenizedMessage.userId = userId;
		tokenizedMessage.mentionName = mentionName;
		return tokenizedMessage;
	},
	extractItems(player) {
		var playerItems = [], item;
		for (var i = 0; i <= 5; i++) {
			item = +player["item_" + i];
			if (item !== 0) {
				playerItems[item] = items[item];
			}
		}
		return playerItems;
	},
	getMatchDetails(matchId) {
		var deferred = q.defer();
		console.log("getting match details for: ", matchId);
		dota2Api.getMatchDetails(matchId, function(err, apiResponse){
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(apiResponse);
			}
		});
		return deferred.promise;
	},
	getNthMatch(accountId, n) {
		var deferred = q.defer();
		if (!accountId) {
			deferred.reject("Account for that user could not be found.");
		}
		console.log("getting match: ", n, " for account id: ", accountId);
		dota2Api.getMatchHistory({account_id: accountId, matches_requested: n + 1}, function(err, apiResponse){ // eslint-disable-line camelcase
			if (err) {
				deferred.reject(err);
			} else if (helpers.statusCheck(apiResponse)) {
				deferred.reject(apiResponse.statusDetail);
			} else {
				deferred.resolve(apiResponse.matches[n]);
			}
		});
		return deferred.promise;
	},
	/**
	 * Returns a promise for [steamId, accountId].
	 */
	getIds(dotaId:number) {
		var steamId = (new BigNum(dotaId)).plus("76561197960265728").toString();
		return q([steamId, dotaId]);
	},
	getHero(hero) {
		return heroes[hero];
	}
};

module.exports = helpers;
