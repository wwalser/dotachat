var controllers = require('../controllers');
/**
 * Response to hipchat messages.
 */
module.exports = function(request, response) {
	var confluenceHipchat = controllers.ConfluenceHipchat(request, response);
};