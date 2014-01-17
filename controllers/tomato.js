var Q = require("q");
var http = require('http');
var nodeRequest = require("request");
var apiKey = process.env.ROTTEN_TOMATOES_API_KEY;
var hipchatToken = process.env.HIPCHAT_TOKEN;
var templateName = "dota2Message";

function RottenTomatoes(request, response){
	var message = request.body.item.message.message;
	var roomId = request.body.item.room.id;
	var notificationUrl = "https://www.hipchat.com/v2/room/"+ roomId + "/notification?auth_token=" + hipchatToken;
	var movieName = getMovieNameFromMessage(message ? message : request.query.movie);
	var movieRequest = searchMovies(movieName);
	var respondWith = {
		"from": "TomatoChat",
		"message": '',
		"color": "gray",
		"message_format": "html"
	}
	movieRequest
		.then(function(movieSearch){
			var movie = movieSearch.movies[0];
			var fresh = movie.ratings.critics_rating && (movie.ratings.critics_rating.indexOf("Fresh") !== -1);
			console.log(movie.ratings.critics_rating);
			respondWith.message = "<img src=\"" + movie.posters.thumbnail + "\"> "
				+ "&nbsp;<a href=\"" + movie.links.alternate + "\">" + movie.title + "</a>"
				+ " Critics: " + movie.ratings.critics_score 
				+ ", Audience: " + movie.ratings.audience_score;
			respondWith.color = fresh ? 'green' : 'red';
			response.json(respondWith);
			//User roomid == "test" to test this on a local machine.
			if (roomId !== "test") {
				nodeRequest.post(notificationUrl, {json: respondWith});
			}
		})
		.catch(function(error){
			respondWith.color = "yellow"
			if (typeof error === "string") {
				respondWith.message = error;
			} else {
				console.log('request rejected?', error);
				respondWith.message = "Error gathering data.";
			}
			response.json(respondWith);
			//User roomid == "test" to test this on a local machine.
			if (roomId !== "test") {
				nodeRequest.post(notificationUrl, {json: respondWith});
			}
		});
}
module.exports = RottenTomatoes;

function getMovieNameFromMessage(message) {
	var movieName = message;
	if (movieName.indexOf(' ') !== -1) {
		movieName = movieName.substring(movieName.indexOf(' ')+1);
	}
	return movieName;
}
function searchMovies(movieName){
	var deferred = Q.defer();
	var url = "http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey=" + apiKey
	url += "&page_limit=1&q=" + movieName;
	var req = http.get(url, function(res){
        var data = '';
		
        res.on('data', function (chunk) {
            data += chunk;
        });
		
        res.on('end',function () {
			try {
				var obj = JSON.parse(data);
				if (obj.movies.length) {
					deferred.resolve(obj);
				} else {
					deferred.reject("No movies found.");
				}
			} catch (e) {
				console.log('Invalid JSON response.', e);
				deferred.reject("Invalid JSON response.");
			}
        });		
	});
    req.on('error', function (e) {
		console.log('error on request', e);
        deferred.reject(e);
    });
	return deferred.promise;
}