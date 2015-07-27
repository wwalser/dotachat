//@flow
var q = require("q");
var helpers = require("./dota2/helpers");
var templateName = "dota2Message";

type matchData = {
		player: {
				name: string,
				avatar: string,
				hero: string,
				items: Array<string>,
				kills: string,
				deaths: string,
				assists: string,
				gpm: string,
				xpm: string,
		},
		victory: boolean,
		matchId: string
}

function Dota2Chat(fullMessage:string, templateRender:(x:string, y:matchData)=>string){
	var message = helpers.messageParameters(fullMessage);
	var respondWith = {
		"message": "",
		"color": "gray",
		"message_format": "html"
	};
	//if there was a payload message, use that, otherwise look for a query parameter.
	return helpers.getAccountFromMessage(message.account)
        .spread(function (steamId, accountId) {
            //convert steamId into accountId https://developer.valvesoftware.com/wiki/SteamID
            var playerInfo = helpers.getPlayerInfo(steamId);
            var matchDetails = helpers.getNthMatch(accountId, message.offset)
                .get("match_id")
                .then(helpers.getMatchDetails);

            return q.all([matchDetails, playerInfo, q(accountId)]);
        }).spread(function(matchDetails, playerInfo, accountId) {
            console.log("got match id and player info.");
            var radiant;
            var templateData = {
                player: {
                    name: playerInfo.personaname,
                    avatar: playerInfo.avatar,
										xpm: "",
										hero: "",
										items: [],
										kills: "",
										deaths: "",
										assists: "",
										gpm: ""
                },
								victory: false,
								matchId: ""
            };

            for (var player in matchDetails.players) {
                if (matchDetails.players.hasOwnProperty(player)) {
                    player = matchDetails.players[player];
                    if (player.account_id === accountId) {
                        radiant = player.player_slot < 100;
                        templateData.player.hero = helpers.getHero(player.hero_id);
                        templateData.player.items = helpers.extractItems(player);
                        templateData.player.kills = player.kills;
                        templateData.player.deaths = player.deaths;
                        templateData.player.assists = player.assists;
                        templateData.player.gpm = player.gold_per_min;
                        templateData.player.xpm = player.xp_per_min;
                    }
                }
            }
            templateData.matchId = matchDetails.match_id;
            templateData.victory = radiant === matchDetails.radiant_win;
            respondWith.color = templateData.victory ? "green" : "red";
            return templateRender(templateName, templateData);
        }).then(function(renderedMessage){
            respondWith.message = renderedMessage;
            console.log("template rendered", respondWith);
            return respondWith;
        }).catch(function(errorMessage:string){
            console.log("Failed to get match details or player info.", message.account, errorMessage);
            respondWith.message = "Error on: " + message.account + "<br/>" + errorMessage;
            respondWith.color = "yellow";
            return respondWith;
        });
}
// Export Dota2Chat.
module.exports = Dota2Chat;
