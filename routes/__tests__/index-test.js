"use strict";
jest.autoMockOff();
jest.useRealTimers();

jest.mock('mailgun-send');
jest.mock('../../lib/email');
jest.mock('rsvp');
jest.mock('../../lib/hipchat');
jest.mock('crypto');

var authenticateMiddleware = jest.genMockFunction();
function createAddon(){
    return {
        settings: {},
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

describe('Authenticated routes', function(){
    it('Webhook is authenticated', function(){
        var addon = createAddon();
        var app = createApp();
        createRoutes(app, addon);

        expect(app.getRouteCallbacks('post', '/webhook')[1]).toEqual(addon.authenticate());
    });

    it('Config is authenticated', function(){
        var addon = createAddon();
        var app = createApp();
        createRoutes(app, addon);

        expect(app.getRouteCallbacks('get', '/config')[1]).toEqual(addon.authenticate());
    });
});