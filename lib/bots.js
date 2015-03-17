"use strict";
var _ = require('lodash');
var Q = require('q');
var validate = require('validate');
var crypto = require('crypto');
module.exports = function(addon) {
    var client = addon.settings.client;
    var email = require('./email')(addon);
    /**
     * "next_bot_id": Incrementing value of the next bot id.
     * "bots": list containing a list of all bot ids.
     * "bot:*": hashes representing a bot where * is it's id
     * "bot_keywords": hash of bot keywords to bot ids
     * "bot_secrets": hash of bot URLs to bot ids
     * "*:installed": set of bots installed in a tennant where * is a clientKey
     */
    var NEXT_BOT_ID = "next_bot_id";
    var BOTS = "bots";
    var BOT = "bot:";
    var BOT_KEYWORDS = "bot_keywords";
    var BOT_SECRETS = "bot_secrets";
    var INSTALLED_BOTS = ":installed";

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
        },
        email: {
            type: 'string',
            required: true,
            match: /.+\@.+\..+/,
            message: "Email is required."
        }
    });

    function addBotValidator(bot) {
        var hget = Q.nbind(client.hget, client);
        var valid = botSchema.validate(bot);
        if (valid.length) {
            return Q.reject(valid[0]);
        }
        return hget(BOT_KEYWORDS, bot.keyword).then(function(reply){
            if (reply === null) {
                return bot;
            } else {
                return Q.reject('Keyword is already in use.');
            }
        });
    }

    function addBotToRedis(bot){
        var rpush = Q.nbind(client.rpush, client);
        var hmset = Q.nbind(client.hmset, client);
        var hset = Q.nbind(client.hset, client);
        var incr = Q.nbind(client.incr, client);
        var salt = Q.nbind(crypto.randomBytes, crypto);
        var shasum = crypto.createHash('sha1');

        console.log('Adding bot to db');
        var getNextId = incr(NEXT_BOT_ID);
        var getSalt = salt(16);

        //increment id and create unique url -> add all the things -> return the bot.
        return Q.all([getNextId, getSalt])
            .spread(function(id, salt) {
                bot.id = id;
                shasum.update(salt.toString('base64') + bot.email);
                bot.secret = shasum.digest('base64');
                return bot;
            }).then(function(bot){
                var addToBotList = rpush(BOTS, bot.id);
                var addToBotsHashs = hmset(_.transform(bot, function(result, value, key){
                    result.push(key); result.push(value);
                }, [BOT + bot.id]));
                var addToKeywordsHashs = hset(BOT_KEYWORDS, bot.keyword, bot.id);
                var addToBotSecrets = hset(BOT_SECRETS, bot.secret, bot.id);
                return Q.all([addToBotList, addToBotsHashs, addToKeywordsHashs, addToBotSecrets]);
            })
            .then(function(){
                return bot;
            }, function(){
                return Q.reject('DB failure.');
            });
    }

    function removeBotFromRedis(bot) {
        var lrem = Q.nbind(client.lrem, client);
        var del = Q.nbind(client.del, client);
        var hdel = Q.nbind(client.hdel, client);

        var calls = [];
        calls.push(lrem(BOTS, 1, bot.id));
        calls.push(del(BOT + bot.id));
        calls.push(hdel(BOT_KEYWORDS, bot.keyword));
        calls.push(hdel(BOT_SECRETS, bot.secret));

        return Q.all(calls).spread(function(lrem, del, hdel1, hdel2){
            console.log('remove bot', arguments);
            if (lrem === 1 && del === 1 && hdel1 === 1 && hdel2 === 1) {
                return Q(true);
            } else {
                //console.log("removeBotsFromRedis error: ", lrem, del, hdel1, hdel2);
                return Q.reject('Unexpected failure in DB.');
            }
        });
    }

    function emailBotCreated(bot){
        email.sendBotCreatedEmail(bot);
        return bot;
    }

    var methods = {
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
            console.log('adding bot: ', bot);
            return addBotValidator(bot)
                .then(addBotToRedis)
                .then(emailBotCreated);
        },
        editBot: function(bot){
            //Just remove and create a new one.
            //The bot provided is from a form, delegate to methods.deleteBot
            //so that the bot is looked up by secret securely.
            return methods.deleteBot(bot.secret)
                .then(function(){
                    //delete doesn't return a bot, use the bot that was passed to edit.
                    return addBotValidator(bot);
                })
                .then(addBotToRedis);
        },
        deleteBot: function(botSecret){
            return methods.getBotFromSecret(botSecret)
                .then(removeBotFromRedis);
        },
        getBotFromSecret: function(botSecret) {
            var hget = Q.nbind(client.hget, client);
            var hgetall = Q.nbind(client.hgetall, client);

            console.log("getting bot from secret", botSecret);
            return hget(BOT_SECRETS, botSecret)
                .then(function(botId) {
                    if (botId !== null) {
                        console.log('found bot id, getting bot from id: ', botId);
                        return hgetall(BOT + botId);
                    } else {
                        return Q.reject('Bot with that secret does not exist.');
                    }
                }).then(function(bot){
                    console.log('the bot!', bot);
                    return bot;
                });
        },
        getBotFromKeyword: function(botKeyword) {
            var hget = Q.nbind(client.hget, client);
            var hgetall = Q.nbind(client.hgetall, client);

            console.log("getting bot from keyword", botKeyword);
            return hget(BOT_KEYWORDS, botKeyword)
                .then(function(botId) {
                    if (botId !== null) {
                        console.log('found bot id, getting bot from id: ', botId);
                        return hgetall(BOT + botId);
                    } else {
                        return Q.reject('Bot with that keyword does not exist.');
                    }
                }).then(function(bot){
                    console.log('the bot!', bot);
                    return bot;
                });
        },
        installBots: function(botId){
            var sadd = Q.nbind(client.sadd, client);
            return sadd([clientKey + INSTALLED_BOTS].concat(_.toArray(arguments)));
        },
        installDefaultBots: function(clientKey){
            return this.getAllBots().then(function(allBots){
                return this.installBots.apply(this, (_.filter(allBots, function(bot){
                    return bot.featured;
                }).map(function(featuredBot){
                    return featuredBot.id;
                })));
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
            };
        }
    };



    return methods;
};