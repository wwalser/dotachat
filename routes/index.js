var controllers = require('../controllers');
/**
 * Response to hipchat messages.
 */
exports.index = function(request, response) {
	var dota2Chat = controllers.Dota2Chat(request, response);
};