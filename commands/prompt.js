module.exports = (function() {
	'use strict';
	return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [],
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
	        bot.sendMessage({
		        to: channelId,
		        message: 'THIS IS THE PROMPT COMMAND'
	        });
        }
	};
})();