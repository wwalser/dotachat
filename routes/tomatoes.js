var controllers = require('../controllers');
/**
 * Response to hipchat messages.
 */
module.exports = function(request, response) {
	var rottenTomatoes = controllers.RottenTomatoes(request, response);
};