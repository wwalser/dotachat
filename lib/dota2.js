//@flow
var q = require("q");
var helpers = require("./dota2/helpers");
var templateName = "dota2Message";
var respondWith = {
	"message": "",
	"color": "gray",
	"message_format": "html"
};

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

type hipchatMessage = {
	message: string,
	from: {
		id: number
	}
}

type tokenizedMessage = {
	account: string,
	mentionName: string,
	userId: number,
	offset: number,
	addDotaId: number
}

type ejsTemplateRenderer = (x:string, y:matchData)=>string

function matchDetailsRequest(message:tokenizedMessage, templateRender:ejsTemplateRenderer) {
	return helpers.getAccountFromMessage(message.userId)
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
										console.log('Found player in match details');
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
    });
}

function addPlayerDetailsRequest(message:tokenizedMessage) {
	return helpers.addPlayerDetails(message)
		.then(function(){
			respondWith.color = "green";
			return "Player " + message.mentionName + " was added to DotaBot.";
		})
}

function Dota2Chat(messageObject:hipchatMessage, templateRender:ejsTemplateRenderer){
	var message = helpers.messageParameters(messageObject);
	var request;

	if (message.addDotaId !== -1) {
		request = addPlayerDetailsRequest(message);
	} else {
		request = matchDetailsRequest(message, templateRender);
	}

	return request.then(function(renderedMessage){
    respondWith.message = renderedMessage;
    console.log("template rendered", respondWith);
    return respondWith;
  }).catch(function(errorMessage:string){
    console.log("Failed to get match details or player info.", message.mentionName, errorMessage);
    respondWith.message = "Error on: " + message.mentionName + "<br/>" + errorMessage;
    respondWith.color = "yellow";
    return respondWith;
  });
}
// Export Dota2Chat.
module.exports = Dota2Chat;
