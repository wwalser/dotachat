jest.autoMockOff();
jest.useRealTimers();

jest.mock('../email');
jest.mock('mailgun-send');

var redis = require('fakeredis');
redis.fast = true;

var dbIdx = 0;
function createBot(){
    var addon = {settings: {
        client: redis.createClient('fakedb_' + dbIdx++)
    }};
    return require('../bots')(addon);
}

describe('bots', function(){
    pit('Adding a bot works?', function(){
        var bots = createBot();
        var name = 'Test bot';
        var url = 'http://atlassian.com';
        var keyword = 'testing';
        var email = 'wwalser@atlassian.com';

        var botAddition = bots.addBot({
            name: name,
            url: url,
            keyword: keyword,
            homepage: url,
            email: email
        }).then(function(bot){
            expect(bot['name']).toEqual(name);
            expect(bot.url).toEqual(url);
            expect(bot.keyword).toEqual(keyword);
            expect(bot.homepage).toEqual(url);
            expect(bot.email).toEqual(email);
            expect(bot.id).toEqual(1);
        });

        jest.runAllTimers();
        return botAddition;
    });
});