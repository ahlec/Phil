module.exports = (function() {
	'use strict';
	return {
        requiresAdmin: false,
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
	        bot.sendMessage({
		        to: channelId,
		        message: 'THIS IS THE PROMPT COMMAND'
	        });
        }
	};
})();