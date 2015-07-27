var Q = require("q");

module.exports = {
    timed: function(promise, message){
        var timer = Q.defer();
        var tooSlow = setTimeout(function(){
            console.log("API was too slow");
            timer.reject({
                "message": message || "The API that this bot uses is too slow.",
                "color": "yellow",
                "message_format": "text"
            });
        }, 8000);

        promise.tap(function(){
            clearTimeout(tooSlow);
            timer.resolve("Super fast!");
        });

        return Q.all([promise, timer.promise]).spread(function(){
            return arguments[0];
        });
    }
};
