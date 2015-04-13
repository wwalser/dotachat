//Quick-bots, the fun starts here:

var express = require('express');
var ac = require('./lib/ac-plus');
process.env.PWD = process.env.PWD || process.cwd(); // Fix expiry on Windows :(
// Static expiry middleware to help serve static resources efficiently
var expiry = require('static-expiry');
// We use [Handlebars](http://handlebarsjs.com/) as our view engine
// via [express-hbs](https://npmjs.org/package/express-hbs)
var hbs = require('express-hbs');
// We also need a few stock Node modules
var http = require('http');
var path = require('path');
var os = require('os');

// Let's use Redis to store our data
ac.store.register('redis', require('atlassian-connect-express-redis'));

// Anything in ./public is served up as static content
var staticDir = path.join(__dirname, 'public');
// Anything in ./views are HBS templates
var viewsDir = __dirname + '/views';
var layoutsDir = __dirname + '/views/layouts';
var partialsDir = __dirname + '/views/partials';
// Your routes live here; this is the C in MVC
var routes = require('./routes');
// Bootstrap Express
var app = express();
// Declares the environment to use in `config.js`
var devEnv = app.get('env') == 'development';
// Bootstrap the `atlassian-connect-express` library
var addon = ac(app);
// You can set this in `config.js`
var port = addon.config.port();

// Load the HipChat AC compat layer
var hipchat = require('atlassian-connect-express-hipchat')(addon, app);

// The following settings applies to all environments
app.set('port', port);

// Configure the Handlebars view engine
app.engine('hbs', hbs.express3({
    partialsDir: partialsDir,
    layoutsDir: layoutsDir
}));
app.set('view engine', 'hbs');
app.set('views', viewsDir);

// Declare any Express [middleware](http://expressjs.com/api.html#middleware) you'd like to use here
app.use(express.favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));
// Log requests, using an appropriate formatter by env
app.use(express.logger(devEnv ? 'dev' : 'default'));
// Include stock request parsers
app.use(express.urlencoded());
app.use(express.json());
app.use(express.cookieParser());
// Gzip responses when appropriate
app.use(express.compress());
// Enable the ACE global middleware (populates res.locals with add-on related stuff)
app.use(addon.middleware());
// Enable static resource fingerprinting for far future expires caching in production
app.use(expiry(app, {dir: staticDir, debug: devEnv}));
// Add an hbs helper to fingerprint static resource urls
hbs.registerHelper('furl', function(url){ return app.locals.furl(url); });
hbs.registerHelper('encodeUriComponent', function(thing){ return encodeURIComponent(thing); });
// Mount the add-on's routes
app.use(app.router);
// Mount the static resource dir
app.use(express.static(staticDir));

// Do nice things for dev mode
if (devEnv) {
    app.use(express.errorHandler());
    ac.devMode(addon);
}

// Wire up your routes using the express and `atlassian-connect-express` objects
routes(app, addon);

// Boot the damn thing
http.createServer(app).listen(port, function(){
  console.log()
  console.log('Add-on server running at '+ (addon.config.localBaseUrl()||('http://' + (os.hostname()) + ':' + port)));
});
