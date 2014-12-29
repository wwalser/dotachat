var mailGun = require('mailgun-send');
mailGun.config({
    key: process.env.MG_API_KEY,
    sender: 'bot-created@' + process.env.MG_DOMAIN
});

module.exports = function(addon){
    var botUrl = (addon.config.localBaseUrl()||('http://' + (os.hostname()) + ':' + port)) + '/bot?bot=';
    return {
        sendBotCreatedEmail: function(bot){
            var botSecret = botUrl + encodeURIComponent(bot.secret);
            var emailAddress = bot.email;
            var keyword = bot.keyword;

            mailGun.send({
                subject: 'Bot added at QuickBots!',
                recipient: emailAddress,
                body: '<h2>New QuickBot identified!<h2>'
                    + '<p>Your bot has been created and will be hit any time /' +  keyword + ' is sent in rooms where this bot is active.</p>'
                    + '<p>If you ever need to change the configuration of your bot go to <a href="' + botSecret + '">It\'s configure page.</a></p>'
                    + '<p>Thanks for using QuickBots.</p>'
            });
        },
        sendBotUrlReminder: function(emailAddress, botHash){
            var botUrl = botUrl + encodeURIComponent(botHash);
            mailGun.send({
                subject: 'QuickBot config reminder',
                recipient: emailAddress,
                body: '<h2>QuickBot config reminder<h2>'
                    + '<p>The unique URL for your bot is "<a href="' + botUrl + '">' + botUrl + '</a>".</p>'
            });
        }
    }
};