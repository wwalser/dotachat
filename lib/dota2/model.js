//@flow
var q = require("q");
var Redis = require('ioredis');
var redis = new Redis(process.env.DATABASE_URL);

/**
 * "hc_to_dota:*": A dota id where * is a hipchat id.
 */
var HC_TO_DOTA = "hc_to_dota:"

var d2model = {
  getDotaIdFromHipchatId(hipchatId:number) {
    return redis.get(HC_TO_DOTA + hipchatId).then(function(dotaId){
      if (dotaId) {
        return q(+dotaId);
      } else {
        return q.reject("No Dota ID associated with that HipChat User ID.<br />Use: '/dota add $dotaId' to add yourself to the bot.");
      }
    });
  },
  setDotaIdFromHipchatId(hipchatId:number, dotaId:number) {
    return redis.set(HC_TO_DOTA+ hipchatId, dotaId);
  }
}

module.exports = d2model;
