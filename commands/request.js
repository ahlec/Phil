module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    return {
        requiresAdmin: false,
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            if (commandArgs.length === 0) {
                botUtils.sendErrorMessage({
                    bot: bot,
                    channelId: channelId,
                    message: '`' + process.env.COMMAND_PREFIX + 'request` requires a parameter:\n' +
                        '[1] the requestable name of the role to be granted'
                });
                return;
            }

	        console.log(commandArgs[0]);
            db.query("SELECT role_id FROM requestable_roles WHERE request_string = $1", [commandArgs[0]])
                .then(result => {
                    if (result.rowCount === 0) {
                        botUtils.sendErrorMessage({
                            bot: bot,
                            channelId: channelId,
                            message: 'There is no requestable role identified by the name of `' + commandArgs[0] + '`'
                        });
                        return;
                    }

                    const roleId = result.rows[0].role_id;
                    const serverId = bot.channels[channelId].guild_id;
                    const server = bot.servers[serverId];
                    const member = server.members[userId];

                    if (roleId in member.roles) {
                        const role = server.roles[roleId];
                        botUtils.sendErrorMessage({
                            bot: bot,
                            channelId: channelId,
                            message: 'You already have the `' + role.name + '` role.'
                        });
                        return;
                    }

                    console.log( roleId );
                    console.log( typeof( roleId ) );

                    bot.addToRole({
                        serverID: serverId,
                        userID: userId,
                        roleID: roleId
                    }, (err, response) => {
                        if (err) {
                            console.log(err);
                            botUtils.sendErrorMessage({
                                bot: bot,
                                channelId: channelId,
                                message: 'Discord error when attempting to grant the user the specified role. `' + botUtils.toStringDiscordError(err) + '`'
                            });
                        } else {
                            botUtils.sendSuccessMessage({
                                bot: bot,
                                channelId: channelId,
                                message: 'You have been granted the `' + role.name + '` role!'
                            });
                        }
                    });
                })
                .catch(err => {
                    botUtils.sendErrorMessage({
                        bot: bot,
                        channelId: channelId,
                        message: 'Database error when attempting to lookup the request string. `' + err + '`'
                    });
                });
        }
    };
})();