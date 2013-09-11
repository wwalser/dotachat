var ApiClient = require('./api-client');
var SteamClient1 = new ApiClient(false, {steamApiVersion: '0001', accessor: 'response'});

SteamClient1.fn.extend('getSteamId', function (username, next) {
    this.invoke('ResolveVanityURL')
        .using({vanityurl: username})
        .on('ISteamUser')
        .then(next);
});

module.exports = exports = SteamClient1;