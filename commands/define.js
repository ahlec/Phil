module.exports = (function() {
	'use strict';
	return {
        requiresAdmin: true,
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            if (commandArgs.length < 2) {
	            bot.sendMessage({
                    to: channelId,
                    message: '**ERROR.** `' + process.env.COMMAND_PREFIX + 'define` requires two parameters, separated by a space:\n' +
                        '[1] the text to be used by users with `' + process.env.COMMAND_PREFIX + 'request` (cannot contain any spaces)\n' +
                        '[2] the full name of the Discord role (as it currently is spelled)'
	            });
                return;
            }

	        const requestString = commandArgs[0];
	        const roleName = commandArgs.slice(1).join(' ');
	        const serverId = bot.channels[channelId].guild_id;
	        const server = bot.servers[serverId];
            var role;
            for (let roleId in server.roles) {
                console.log(roleId);
                if (server.roles[roleId].name.toLowerCase() === roleName.toLowerCase()) {
                    role = server.roles[roleId];
	                break;
                }
            }

	        if (role === undefined) {
		        bot.sendMessage({
			        to: channelId,
			        message: '**ERROR.** There is no role with the name of `' + roleName + '`.'
		        });
                return;
	        }

	        bot.sendMessage({
		        to: channelId,
		        message: 'Going to register `' + requestString + '` for role `' + role.name + '` (' + role.id + ')'
	        });

	        /*db.query("SELECT role_id FROM requestable_roles WHERE request_string LIKE $1", [requestedRoleName])
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
                .catch(err => console.error(err));*/
        }
	};
})();