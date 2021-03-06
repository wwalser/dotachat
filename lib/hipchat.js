"use strict";
var RSVP = require('rsvp');
var http = require('request');
var _ = require('lodash');

module.exports = function(addon) {

  function request(clientInfo, options){

    return new RSVP.Promise(function(resolve, reject){

      function makeRequest(clientInfo) {
        addon.getAccessToken(clientInfo).then(function(token){
          var hipchatBaseUrl = clientInfo.capabilitiesDoc.links.api;
          http({
            method: options.method || 'GET',
            url: hipchatBaseUrl + options.resource,
            qs: _.extend({auth_token: token.access_token}, options.qs),
            body: options.body,
            json: true
          }, function(err, resp, body){
            if (err) {
              reject(err);
              return;
            }
            resolve(resp);
          });
        });
      }

      if (!clientInfo) {
        reject(new Error('clientInfo not available'));
        return;
      }
      if (typeof clientInfo === 'object'){
        makeRequest(clientInfo);
      } else {
        addon.loadClientInfo(clientInfo).then(makeRequest);
      }

    });

  }

  function fail(response, reject) {
    var code = response.statusCode;
    var msg = 'Unexpected response: [' + code + '] ' + require('http').STATUS_CODES[code];
    var err = new Error(msg);
    err.response = response;
    reject(err);
  }

  return {

    sendMessage: function (clientInfo, roomId, msg, opts){
      opts = (opts && opts.options) || {};
      return request(clientInfo, {
        method: 'POST',
        resource: '/room/' + roomId + '/notification',
        body: {
          message: msg,
          message_format: (opts.format ? opts.format : 'html'),
          color: (opts.color ? opts.color : 'yellow'),
          notify: (opts.notify ? opts.notify : false)
        }
      });
    },

    getRoomWebhooks: function (clientInfo, roomId){
      return new RSVP.Promise(function (resolve, reject) {
        var all = [];
        function getPage(offset) {
          request(clientInfo, {
            method: 'GET',
            resource: '/room/' + roomId + '/webhook',
            qs: {'start-index': offset}
          }).then(function (response) {
            if (response.statusCode === 200) {
              var webhooks = response.body;
              if (webhooks.items.length > 0) {
                all = all.concat(webhooks.items);
                getPage(all.length);
              } else {
                resolve(all);
              }
            } else {
              fail(response, reject);
            }
          }, reject);
        }
        getPage(0);
      });
    },

    addRoomWebhook: function (clientInfo, roomId, webhook) {
      return request(clientInfo, {
        method: 'POST',
        resource: '/room/' + roomId + '/webhook',
        body: webhook
      });
    },

    removeRoomWebhook: function (clientInfo, roomId, webhookId) {
      return request(clientInfo, {
        method: 'DELETE',
        resource: '/room/' + roomId + '/webhook/' + webhookId
      });
    },
      tokenizeMessage: function (fullMessage){
          var message = fullMessage.substring(1);
          var space = message.indexOf(" ");
          var keywordOffset;
          var restOffset;
          if (space === -1)
          {
              keywordOffset = message.length;
              restOffset = message.length;
          }
          else
          {
              keywordOffset = space;
              restOffset = space + 1;
          }
          return {
              full: message,
              keyword: message.substr(0, keywordOffset),
              rest: message.substring(restOffset)
          };
      },
      cleanData: function(data){
          return _.omit(data, ["webhook_id", "oauth_client_id"]);
      }
  };

};
