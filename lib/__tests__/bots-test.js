"use strict";
jest.autoMockOff();
jest.useRealTimers();

jest.mock('../email');
jest.mock('mailgun-send');
jest.mock('crypto');

var Q = require('Q');
var redis = require('fakeredis');
redis.fast = true;

//Once I use something better for logging this can go away.
//console.log = function(){};

var dbIdx = 0;
function createBotsLib(){
    var addon = {settings: {
        client: redis.createClient('fakedb_' + dbIdx++)
    }};
    return require('../bots')(addon);
}

function createRandomBot(botsLib, numberOfBots){
    var bots = [];
    for (var i = 0; i < numberOfBots; i++) {
        bots.push(botsLib.addBot({
            name: 'randomBot' + i,
            url: 'http://www.atlassian.com',
            keyword: 'random' + i,
            homepage: 'http://www.atlassian.com',
            email: 'wwalser@atlassian.com'
        }));
    }
    return Q.all(bots);
}

describe('bots', function(){
    pit.only('Adding a bot works?', function(){
        var bots = createBotsLib();
        var name = 'Test bot';
        var url = 'http://atlassian.com';
        var keyword = 'testing';
        var email = 'wwalser@atlassian.com';

        return bots.addBot({
            name: name,
            url: url,
            keyword: keyword,
            homepage: url,
            email: email
        }).then(function(bot){
            expect(bot.name).toEqual(name);
            expect(bot.url).toEqual(url);
            expect(bot.keyword).toEqual(keyword);
            expect(bot.homepage).toEqual(url);
            expect(bot.email).toEqual(email);
            expect(bot.id).toEqual(1);
        });
    });

    pit('Secret gets created.', function(){
        var bots = createBotsLib();
        var secret = 'super_secret';
        require('crypto').setMyHash(secret);

        return bots.addBot({
            name: 'Test bot',
            url: 'http://atlassian.com',
            keyword: 'testing',
            homepage: 'http://atlassian.com',
            email: 'wwalser@atlassian.com'
        }).then(function(bot){
            expect(bot.secret).toEqual(secret);
        });
    });

    pit('Edit bot works', function(){
        //ensure that editing a bot returns a bot with non-mutated fields unchanged.
        var bots = createBotsLib();
        //unchanged fields
        var keyword, email, homepage;
        //changed field
        var customName = 'custom bot';
        return createRandomBot(bots, 1).spread(function(bot){
            bot.name = customName;
            keyword = bot.keyword;
            email = bot.email;
            homepage = bot.homepage;
            return bots.editBot(bot);
        }).then(function(editedBot){
            expect(editedBot.name).toEqual(customName);
            expect(editedBot.keyword).toEqual(keyword);
            expect(editedBot.email).toEqual(email);
            expect(editedBot.homepage).toEqual(homepage);
        });
    });

    pit('Delete bot works', function(){
        var bots = createBotsLib();
        var keyword;
        return createRandomBot(bots, 1).spread(function(bot){
            keyword = bot.keyword;
            return bots.deleteBot(bot.secret);
        }).then(function(){
            return bots.getBotFromKeyword(keyword);
        }).catch(function(errorMessage){
            expect(errorMessage).toEqual('Bot with that keyword does not exist.');
        });
    });

    pit('Get bot from secret works', function(){
        var bots = createBotsLib();
        var id;
        return createRandomBot(bots, 1).spread(function(bot){
            id = bot.id;
            return bots.getBotFromSecret(bot.secret);
        }).then(function(bot){
            expect(+bot.id).toEqual(id);
        });
    });

    pit('Get bot from keyword works', function(){
        var bots = createBotsLib();
        var id;
        return createRandomBot(bots, 1).spread(function(bot){
            id = bot.id;
            return bots.getBotFromKeyword(bot.keyword);
        }).then(function(bot){
            expect(+bot.id).toEqual(id);
        });
    });
});