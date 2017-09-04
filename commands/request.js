module.exports = (function() {
	'use strict';
	return {
        requiresAdmin: false,
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
	        const requestedRoleName = commandArgs.join(' ');
	        db.query("SELECT role_id FROM requestable_roles WHERE request_string LIKE $1", [requestedRoleName])
		        .then(result => {
			        if (result.rowCount > 0) {
				        bot.sendMessage({
                            to: channelId,
                            message: 'Going to add the role `' + result.rows[0].role_id + '`'
				        });
			        } else {
				        bot.sendMessage({
					        to: channelId,
					        message: 'There is no requestable role with the name \'`' + requestedRoleName + '`\'.'
				        });
			        }
		        })
                .catch(err => console.error(err));
        }
	};
})();