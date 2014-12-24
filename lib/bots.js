var _ = require('lodash');
var Q = require('q');
var validate = require('validate');
module.exports = function(client) {
    /**
     * "next_bot_id": Incrementing value of the next bot id.
     * "bots": list containing a list of all bot ids.
     * "bot:*": hashes representing a bot where * is it's id
     * "bot_keywords": hash of bot keywords to bot ids
     */
    var NEXT_BOT_ID = "next_bot_id";
    var BOTS = "bots";
    var BOT = "bot:";
    var BOT_KEYWORDS = "bot_keywords";

    var botSchema = validate({
        name: {
            type: 'string',
            required: true,
            match: /^.{1,120}$/,
            message: "Name is required and must be no longer than 120 characters."
        },
        url: {
            type: 'string',
            required: true,
            match: /^.{1,300}$/,
            message: "URL is required and must be no longer than 300 characters."
        },
        keyword: {
            type: 'string',
            required: true,
            match: /^.{1,30}$/,
            message: "Keyword is required and must be no longer than 30 characters."
        },
        homepage: {
            type: 'string',
            required: true,
            match: /^.{1,300}$/,
            message: "Homepage is required and must be no longer than 300 characters."
        }
    });

    function addBotValidator(bot) {
        var hget = Q.nbind(client.hget, client);
        var valid = botSchema.validate(bot);
        if (valid.length) {
            return Q.reject(valid[0]);
        }
        return hget(BOT_KEYWORDS, bot.keyword).then(function(reply){
            console.log(reply);
            if (reply === null) {
                return Q(reply);
            } else {
                return Q.reject('Keyword is already in use.');
            }
        });
    }

    return {
        getAllBots: function() {
            var lrange = Q.nbind(client.lrange, client);
            var hgetall = Q.nbind(client.hgetall, client);

            return lrange("bots", 0, -1).then(function(allBotsList){
                return Q.all(allBotsList.map(function(botId){
                    return hgetall(BOT + botId);
                }));
            });
        },
        addBot: function(bot){
            var rpush = Q.nbind(client.rpush, client);
            var hmset = Q.nbind(client.hmset, client);
            var hset = Q.nbind(client.hset, client);
            var incr = Q.nbind(client.incr, client);

            console.log(bot);
            return addBotValidator(bot)
                .then(function(){
                    return incr(NEXT_BOT_ID)
                })
                .then(function(botId){
                    bot.id = botId;
                    var addToBotList = rpush(BOTS, bot.id);
                    var addToBotsHashs = hmset(_.transform(bot, function(result, value, key){
                        result.push(key); result.push(value)
                    }, [BOT + bot.id]));
                    var addToKeywordsHashs = hset(BOT_KEYWORDS, bot.keyword, bot.id);

                    return Q.all([addToBotList, addToBotsHashs, addToKeywordsHashs]);
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
                full: message,
                keyword: message.substr(0, keywordOffset),
                rest: message.substring(restOffset)
            }
        }
    };
};