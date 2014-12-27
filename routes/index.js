var http = require('request');
var _ = require('lodash');
var q = require('q');

module.exports = function (app, addon) {
  var hipchat = require('../lib/hipchat')(addon);
  var bots = require('../lib/bots')(addon.settings.client);

  // Root route. This route will serve the `addon.json` unless a homepage URL is
  // specified in `addon.json`.
  app.get('/',
    function(req, res) {
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

    app.get('/index',function(req, res){
        res.render('index', {title: 'Quick Bots'});
    });

    app.get('/featured',function(req, res){
        res.render('featured', {
            title: 'Featured - Quick Bots',
            featuredSelected: true
        });
    });

    app.get('/build', function(req, res){
        var message;
        if (req.query.message) {
            message = {
                type: req.query.type,
                message: req.query.message,
                title: req.query.type === 'error' ? 'Failure' : 'Success'
            }
        }
        res.render('build', {
            title: "Build - Quick Bot",
            buildSelected: true,
            message: message
        })
    });

    app.post('/addBot', function(req, res){
        bots.addBot(req.body).then(function(){
            res.redirect('/build?type=success&message=Bot successfully created.');
        }, function(err){
            res.redirect('/build?type=error&message=' + err);
            console.log(err);
        })
    });

  // This is an example route that's used by the default for the configuration page
  app.get('/config',
    // Authenticates the request using the JWT token in the request
    addon.authenticate(),
    function(req, res) {
      // The `addon.authenticate()` middleware populates the following:
      // * req.clientInfo: useful information about the add-on client such as the
      //   clientKey, oauth info, and HipChat account info
      // * req.context: contains the context data accompanying the request like
      //   the roomId
      res.render('config', req.context);
    }
  );

    // This is an example route to handle an incoming webhook
    app.post('/webhook',
        addon.authenticate(),
        function(req, res) {
            res.send(200);
            bots.getAllBots().then(function(allBots) {
                var deferred = q.defer();
                var message = bots.tokenizeMessage(req.context.item.message.message);
                var botToUse = _.find(allBots, function(bot){
                    console.log(bot);
                    return bot.keyword === message.keyword;
                });
                if (!botToUse) {
                    console.log('Message: ', message, 'Had no representative bot to use.');
                    return;
                }
                console.log('Using bot: ', botToUse);
                http.post({
                    url: botToUse.url,
                    json: message,
                    timeout: 20000
                }, function(err, responseObj, body){
                    if (err) {
                        if (err.code) {
                            console.log("Request error: ", err.code.toString());
                        }
                        deferred.reject(err);
                    } else {
                        deferred.resolve(body);
                    }
                });
                return deferred.promise;
            }).then(function(body){
                console.log('body: ', body);
                hipchat.sendMessage(req.clientInfo, req.context.item.room.id, body.message, {options: body});
            }, function(err){
                console.log(err);
                if (err.code) {
                    hipchat.sendMessage(req.clientInfo, req.context.item.room.id, err.code.toString());
                } else {
                    hipchat.sendMessage(req.clientInfo, req.context.item.room.id, 'DB or unknown trouble.');
                }
            });
        }
    );

  // Notify the room that the add-on was installed
  addon.on('installed', function(clientKey, clientInfo, req){
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' add-on has been installed in this room');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function(id){
    addon.settings.client.keys(id+':*', function(err, rep){
      rep.forEach(function(k){
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

};
