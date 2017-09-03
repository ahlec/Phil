module.exports = (function() {
	'use strict';
	return {
        processPublicMessage: function(bot, user, userId, channelId, message) {
	        bot.sendMessage({
		        to: channelId,
		        message: 'THIS IS THE PROMPT COMMAND'
	        });
        }
	};
})();