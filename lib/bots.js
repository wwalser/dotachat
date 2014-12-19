var _ = require('lodash');
var Q = require('q');
module.exports = function(client) {
    /**
     * "bots": list containing a list of all bot ids
     * "bot:*" hashes representing a bot where * is it's id
     */
    return {
        getAllBots: _.once(function() {
            var lrange = Q.nbind(client.lrange, client);
            var hgetall = Q.nbind(client.hgetall, client);

            return lrange("bots", 0, -1).then(function(allBotsList){
                return Q.all(allBotsList.map(function(botId){
                    return hgetall("bot:" + botId);
                }));
            });
        }),
        addBot: function(bot){
            var rpush = Q.nbind(client.rpush, client);
            var hmset = Q.nbind(client.hmset, client);
            var incr = Q.nbind(client.incr, client);
            return incr("next_bot_id").then(function(botId){
                bot.id = botId;
                var addToBotList = rpush("bots", bot.id);
                var addToBotsHashs = hmset(_.transform(bot, function(result, value, key){
                    result.push(key); result.push(value)
                }, ["bot:" + bot.id]));

                return Q.all([addToBotList, addToBotsHashs]);
            });
        },
        tokenizeMessage: function(fullMessage){
            var message = fullMessage.substring(1);
            var space = message.indexOf(" ");
            var keywordOffset;
            var restOffset;
            if (space === -1) {
                keywordOffset = message.length;
                restOffset = message.length;
            } else {
                keywordOffset = space;
                restOffset = space+1;
            }
            return {
                keyword: message.substr(0, keywordOffset),
                rest: message.substring(restOffset)
            }
        }
    };
};