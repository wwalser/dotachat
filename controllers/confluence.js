var capabilities = {
	name: "Confluence Share to Hipchat Plugin",
	description: "Confluence and Hipchat plugin allowing Confluence shares to be sent to Hipchat.",
	links: { 
		"self": "http://dotachat.herokuapp.com/confluenceHipchat/capabilities"
	},
	//configurable: { "url": "http://dotachat.herokuapp.com/confluenceHipchat/configure"
	capabilities: { 
		hipchatApiConsumer: { scopes: [ "send_notification", "view_group" ] } 
	},
	installable: { callbackUrl: "http://dotachat.herokuapp.com/confluenceHipchat/install" }
};
function ConfluenceHipchat(request, response) {
	console.log(request.params.method);
	switch (request.params.method) {
	case "install":
		install(request, response);
		break;
	default:
		//any other requests should show the capabilities.
		response.json(capabilities);
	}
}
module.exports = ConfluenceHipchat;

function install(request, response){
	console.log(JSON.parse(request.body));
	response.json({message: "success"});
}