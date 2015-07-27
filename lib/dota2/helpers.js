var q = require('q');
var apiKey = process.env.STEAM_API_KEY;
var people = require("../data/people");
var heroes = require("../data/heroes");
var items = require("../data/items");
var dazzle = require("../external/dazzle-node");
var dota2Api = new dazzle.dota(apiKey);
var steamApi = new dazzle.steam(apiKey);
var BigNum = require("bignumber.js");

var helpers = {
	statusCheck(response) {
		return response && response.status !== 1;
	},
	getPlayerInfo(accountId) {
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
	},
	//message can contain either a userID or a user name.
	getAccountFromMessage(message) {
		var account = message;
		if (account.indexOf(' ') !== -1) {
			account = account.split(' ')[1];
		}
		//did the message provide an integer? If so it's probably an accountId
		if (!+account && people[account.toLowerCase()]) {
			console.log('Attempting to find in local people list: ', account);
			account = people[account.toLowerCase()];
		} else if (+account) {
			console.log('Account provided appears to be an integer: ', account);
		} else {
			console.log('Account provided appears to be a vanity url: ', account);
		}
		return getIds(account);
	},
	messageParameters(message:string) {
		var offset = message.indexOf("^");
		if (!message || offset === -1) {
			return {
				account: message,
				offset: 0
			};
		}
		return {
			account: message.substring(0, offset),
			offset: message.substring(offset+1)
		}
	},
	extractItems(player) {
		var playerItems = [], item;
		for (var i = 0; i <= 5; i++) {
			item = +player['item_' + i];
			if (item !== 0) {
	    	playerItems[item] = items[item];
			}
		}
		return playerItems;
	},
	getMatchDetails(matchId) {
	  var deferred = Q.defer();
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
		var deferred = Q.defer();
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
	},
	/**
	 * Returns a promise for [steamId, accountId].
	 */
	getIds(username) {
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
	},
	getHero(hero) {
		return heroes[hero];
	}
}
