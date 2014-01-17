/**
 * Response to hipchat messages.
 */
module.exports = function(request, response) {
	var controllerName = request.params.controller.match(/[0-9a-zA-Z]*/)[0],
		controller;
	
	if (controllerName.length > 0) {
		controller = require('../controllers/' + controllerName);
		controller(request, response);
	}
};