"use strict";
jest.autoMockOff();
jest.useRealTimers();

jest.mock('mailgun-send');
jest.mock('../../lib/email');
jest.mock('rsvp');
jest.mock('../../lib/hipchat');
jest.mock('crypto');

var Q = require('q');
var redis = require('fakeredis');
redis.fast = true;

//Once I use something better for logging this can go away.
//console.log = function(){};

var dbIdx = 0;
var authenticateMiddleware = jest.genMockFunction();
function createAddon(){
    return {
        settings: {
            client: redis.createClient('fakedb_' + dbIdx++)
        },
        on: function(){},
        authenticate: function(){return authenticateMiddleware;}
    };
}
function createApp(){
    var routeList = {get: {}, post: {}};
    var methodCreator = function(verb){
        return function(routeName){
            routeList[verb][routeName] = arguments;
        };
    };
    return {
        get: methodCreator('get'),
        post: methodCreator('post'),
        getRouteCallbacks: function(verb, routeName){
            return routeList[verb][routeName];
        }
    };
}
function createRoutes(app, addon){
    return require('../index')(app, addon);
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

function createFakeReqRes()
{
    var req = {
        context: {
            item: {
                message: {
                    message: "/random0 foobar"
                }
            }
        }
    };
    var res = {
        send: jest.genMockFunction()
    }

    return [req, res];
}

describe('Webhook tests', function(){
    it('Webhook immediately returns 200', function(){
        var addon = createAddon();
        var app = createApp();
        createRoutes(app, addon);

        var webhookFn = app.getRouteCallbacks('post', '/webhook')[2];
        var reqRes = createFakeReqRes();
        webhookFn.apply(this, reqRes);
        expect(reqRes[1].send.mock.calls[0][0]).toBe(200);
    });
});