var ApiClient = require('./api-client');
var SteamClient2 = new ApiClient(false, {steamApiVersion: '0002', accessor: 'response'});

/**
 * Retrieves a list of all Dota 2 heroes
 * @details http://wiki.teamfortress.com/wiki/WebAPI/GetHeroes
 */
SteamClient2.fn.extend('getPlayerSummaries', function (playerIds, next) {
	//playerIds should be either a string, number of array of ids.
	//if it's an array, join.
    if (typeof playerIds === 'object') {
		playerIds = playerIds.join();
	}

    this.invoke('GetPlayerSummaries')
        .using({steamids: playerIds})
        .on('ISteamUser')
        .then(next);
});

SteamClient2.fn.extend('getSteamId', function (username, next) {
    this.invoke('ResolveVanityURL')
        .using({vanityurl: username, steamApiVersion: '0001'})
        .on('ISteamUser')
        .then(next);
});

module.exports = exports = SteamClient2;