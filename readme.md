#Dota Chat
Dotachat responds to HipChat messages (a chat bot) currently there are two seperate "bots" in the dotachat code base.

The primary bot responds with information about recent DOTA2 matches using the [Steam Web API][steamapi].

The second bot, tomato bot, responds with Rotten Tomatoes scores for a movie query using the [Rotten Tomatoes Web API][rtapi].

[steamapi]: http://wiki.teamfortress.com/wiki/WebAPI
[rtapi]: http://developer.rottentomatoes.com/
##Contributing
###Prerequisites
In order to develop and test new features for dotachat you'll need the following:
* Node.js & NPM [get Node.js &NPM][node]
* Heroku Toolbelt [get Heroku Toolbelt][heroku]

[node]: http://nodejs.org/
[heroku]: https://toolbelt.heroku.com/
###Workstation Setup
Dotachat uses two [Heroku config variables][config] which must be setup in your local environment in order to run and test the application.
* ROTTEN_TOMATOES_API_KEY
* STEAM_API_KEY

You'll need to create your own .env file containing your own Rotten Tomato and Steam API keys. Note that both values are not required. If you're only working on one of the bots, you can leave the other blank.

[config]: https://devcenter.heroku.com/articles/config-vars#local-setup
###Running
If you have the prerequisites and workstation setup complete running the application is very easy. From a command line run:
    npm install
This command only needs to be run once so long as you haven't changed any dependencies of the project.
From this point forward in order to run/restart the application run:
    foreman start
This is the Heroku foreman application which will read the local .env variables and launch the node.js applicaion. This command will output the location of the local server (generally localhost:5000). 

###Testing
To test a Dotachat bot, create an http request directed at the local server started by foreman that's shaped like a HipChat webhook.

If you have [HTTPie][httpie] installed you can use the following command to test your local server.
http -f POST http://localhost:5000/poll?testing=stuffprivate_key=19287321 payload='{\"message\": \"buff Nukeem^2\"}'

[httpie]: https://github.com/jkbr/httpie