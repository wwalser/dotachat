"use strict";
var http = require('request');
var _ = require('lodash');
var Q = require('q');
var messages = require('../lib/messages');

module.exports = function (app, addon) {
  var hipchat = require('../lib/hipchat')(addon);
  var bots = require('../lib/bots')(addon);

    // Root route. This route will serve the `addon.json` unless a homepage URL is
    // specified in `addon.json`.
    app.get('/',
        function (req, res) {
            // Use content-type negotiation to choose the best way to respond
            res.format({
                // If the request content-type is text-html, it will decide which to serve up
                'text/html': function () {
                    res.redirect(addon.descriptor.links.homepage);
                },
                // This logic is here to make sure that the `addon.json` is always
                // served up when requested by the host
                'application/json': function () {
                    res.redirect('/atlassian-connect.json');
                }
            });
        }
    );

    app.get('/index', function (req, res) {
        res.render('index', {title: 'Quick Bots'});
    });

    app.get('/featured', function (req, res) {
        res.render('featured', {
            title: 'Featured - Quick Bots',
            featuredSelected: true
        });
    });

    app.get('/build', function (req, res) {
        var message = messages(req);
        res.render('build', {
            title: "Build - Quick Bot",
            buildSelected: true,
            message: message
        });
    });

    app.post('/addBot', function (req, res) {
        bots.addBot(req.body).then(function (bot) {
            var botQuery = '?bot=' + encodeURIComponent(bot.secret);
            var message = "&type=success&message=Bot successfully created.";
            res.redirect('/bot' + botQuery + message);
        }, function (err) {
            res.redirect('/build?type=error&message=' + err);
            console.log(err);
        });
    });

    app.post('/editBot', function (req, res) {
        bots.editBot(req.body).then(function (bot) {
            var botQuery = '?bot=' + encodeURIComponent(bot.secret);
            var message = "&type=success&message=Bot successfully edited.";
            res.redirect('/bot' + botQuery + message);
        }, function (err) {
            res.redirect('/build?type=error&message=' + err);
            console.log(err);
        });
    });

    app.post('/delete', function (req, res) {
        bots.deleteBot(req.body.secret).then(function () {
            var message = "?type=success&message=Bot successfully deleted. I heard him say he would be back.";
            res.redirect('/build' + message);
        }, function (err) {
            res.redirect('/build?type=error&message=' + err);
            console.log(err);
        });
    });

    app.get('/delete', function (req, res) {
        var getBot;

        if (req.query.bot) {
            getBot = bots.getBotFromSecret(req.query.bot);
        } else {
            getBot = Q.reject('Failed to retrieve bot.');
        }

        getBot.then(function (bot) {
            res.render('delete', {
                title: 'Delete - Quick Bot',
                buildSelected: true,
                bot: bot
            });
        }, function (err) {
            res.redirect('/build?type=error&message=' + err);
            console.log(err);
        });
    });

    app.get('/bot', function (req, res) {
        var getBot;
        var message = messages(req);

        if (req.query.bot) {
            getBot = bots.getBotFromSecret(req.query.bot);
        } else {
            getBot = Q.reject('Failed to retrieve bot.');
        }

        getBot.then(function (bot) {
            res.render('edit', {
                title: 'Edit - Quick Bot',
                buildSelected: true,
                bot: bot,
                message: message
            });
        }, function (err) {
            res.redirect('/build?type=error&message=' + err);
            console.log(err);
        });
    });

    // This is an example route that's used by the default for the configuration page
    app.get('/config',
        // Authenticates the request using the JWT token in the request
        addon.authenticate(),
        function (req, res) {
            // The `addon.authenticate()` middleware populates the following:
            // * req.clientInfo: useful information about the add-on client such as the
            //   clientKey, oauth info, and HipChat account info
            // * req.context: contains the context data accompanying the request like
            //   the roomId
            var clientKey = req.clientInfo.clientKey;
            Q.all([bots.getAllBots(), bots.getInstalledBots(clientKey)])
                .spread(function(allBots, installedBotIds){
                    _.each(allBots, function(bot){
                        bot.installed = _.contains(installedBotIds, bot.id);
                    });
                    var botList = _.sortBy(allBots, function(bot){
                        var value = 2;
                        if (bot.featured === "true") {
                            value = 1;
                        }
                        if (bot.installed) {
                            value = 0;
                        }
                        return value;
                    });

                    res.render('config', {context: req.context, bots: botList});
                })
        }
    );

    function toggleBotInstalledState(req, res){
        var install = req.method === "PUT";
        var clientKey = req.clientInfo.clientKey;
        var botToChange = req.body.botId;
        var operation;
        console.log('client-installed-bots', clientKey, botToChange, install);
        if (install) {
            operation = bots.installBots(clientKey, [botToChange]);
        } else {
            operation = bots.uninstallBots(clientKey, [botToChange]);
        }
        operation.then(function(){
            res.send('204 not possible because of bug in reqwest');
        });
    }

    app.put('/client-installed-bots',
            addon.authenticate(),
            toggleBotInstalledState
    );

    app.delete('/client-installed-bots',
            addon.authenticate(),
            toggleBotInstalledState
    );

    // This is an example route to handle an incoming webhook
    app.post('/webhook',
        addon.authenticate(),
        function (req, res) {
            res.send(200);
            var clientKey = req.clientInfo.clientKey;
            Q.all([bots.getAllBots(), bots.getInstalledBots(clientKey)]).spread(function(allBots, installedBotIds){
                var installedBots = _.filter(allBots, function(bot){
                    return _.contains(installedBotIds, bot.id);
                });
                var deferred = Q.defer();
                var message = bots.tokenizeMessage(req.context.item.message.message);
                var botToUse = _.find(installedBots, function (bot) {
                    console.log(bot);
                    return bot.keyword === message.keyword;
                });

                if (!botToUse) {
                    console.log('Message: ', message, 'Had no representative bot to use.');
                    deferred.reject({noShow: true});
                } else {
                    console.log('Using bot: ', botToUse);
                    http.post({
                        url: botToUse.url,
                        json: message,
                        timeout: 20000
                    }, function (err, responseObj, body) {
                        if (err) {
                            if (err.code) {
                                console.log("Request error: ", err.code.toString());
                            }
                            deferred.reject(err);
                        } else {
                            deferred.resolve(body);
                        }
                    });
                }
                return deferred.promise;
            }).then(function (body) {
                console.log('body: ', body);
                hipchat.sendMessage(req.clientInfo, req.context.item.room.id, body.message, {options: body});
                return body;
            }, function (err) {
                console.log(err);
                if (err.noShow) {
                    //Be quiet about it! Do nothing.
                } else if (err.code) {
                    hipchat.sendMessage(req.clientInfo, req.context.item.room.id, err.code.toString());
                } else {
                    hipchat.sendMessage(req.clientInfo, req.context.item.room.id, 'DB or unknown trouble.');
                }
                //return the error and relevant data.
                return Q.reject(_.extend(err, {req: req}));
            });
        }
    );

    // Notify the room that the add-on was installed
    addon.on('installed', function (clientKey, clientInfo, req) {
        bots.installFeaturedBots(clientKey).then(function(){
            console.log('QuickBots installed and default bots auto-enabled.', clientKey);
        }, function(){
            console.log('Failed to install default bots', clientKey);
        });
        hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' add-on has been installed in this room.');
    });

    // Clean up clients when uninstalled
    addon.on('uninstalled', function (id) {
        addon.settings.client.keys(id + ':*', function (err, rep) {
            rep.forEach(function (k) {
                addon.logger.info('Removing key:', k);
                addon.settings.client.del(k);
            });
        });
    });

};
