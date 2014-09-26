/**
 * Script is used the generate a new heroData.js
 * node makeHeroHash.js | pbcopy
 */
var apis = require('../external/dazzle-node/dazzle');
var dota2Api = new apis.dota("980477E4FA4890429F4E4723A6FC38BB");
var imageLocationStart = "http://cdn.dota2.com/apps/dota2/images/heroes/";
var imageLocationEnd = "_sb.png"
var heroNameStartLength = "npc_dota_hero_".length;
var heroData = {};
dota2Api.getHeroes({}, function(err, data){
	data.heroes.forEach(function(hero){
		heroData[hero.id] = {
			name: hero.localized_name,
			image: imageLocationStart + hero.name.substring(heroNameStartLength) + imageLocationEnd
		};
	});
	console.log('module.exports = ', heroData);
});