/* add-on script */
//enable bot handling
document.addEventListener("click", function(event){
    var button = event.target;
    var enabled;
    if (button.nodeName === "BUTTON" && button.parentNode.classList.contains("config-bot-enable")) {
        enabled = button.attributes['data-enabled'].value === "true";
        button.classList.toggle('loading');
        reqwest({
            url: 'client-installed-bots?signed_request=' + ACPT,
            method: enabled ? 'delete' : 'put',
            data: { botId: button.attributes['data-bot'].value },
            success: function (resp) {
                button.classList.toggle('loading');
                button.classList.toggle('enabled');
                button.classList.toggle('disabled');
            }
        });
    }
});