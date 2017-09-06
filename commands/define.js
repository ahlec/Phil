module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    return {
        requiresAdmin: true,
        aliases: [],
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            if (commandArgs.length < 2) {
                botUtils.sendErrorMessage({
                    bot: bot,
                    channelId: channelId,
                    message: '`' + process.env.COMMAND_PREFIX + 'define` requires two parameters, separated by a space:\n' +
                        '[1] the text to be used by users with `' + process.env.COMMAND_PREFIX + 'request` (cannot contain any spaces)\n' +
                        '[2] the full name of the Discord role (as it currently is spelled)'
                });
                return;
            }

            const requestString = commandArgs[0].toLowerCase();
            const roleName = commandArgs.slice(1).join(' ');
            const serverId = bot.channels[channelId].guild_id;
            const server = bot.servers[serverId];
            var role;
            for (let roleId in server.roles) {
                if (server.roles[roleId].name.toLowerCase() === roleName.toLowerCase()) {
                    role = server.roles[roleId];
                    break;
                }
            }

            if (role === undefined) {
                botUtils.sendErrorMessage({
                    bot: bot,
                    channelId: channelId,
                    message: 'There is no role with the name of `' + roleName + '`.'
                });
                return;
            }

            db.query("SELECT count(request_string) FROM requestable_roles WHERE request_string = $1", [requestString])
                .then(result => {
                    if (result.rows[0].count > 0) {
                        botUtils.sendErrorMessage({
                            bot: bot,
                            channelId: channelId,
                            message: 'There is already a `' + requestString + '` request string.'
                        });
                        return;
                    }
                    db.query("INSERT INTO requestable_roles VALUES($1, $2)", [requestString, role.id])
                        .then(insertResult => {
                            botUtils.sendSuccessMessage({
                                bot: bot,
                                channelId: channelId,
                                message: '`' + requestString + '` has been set up for use with `' + process.env.COMMAND_PREFIX + 'request` to grant the ' + role.name + ' role.'
                            });
                        })
                        .catch(err => {
                            botUtils.sendErrorMessage({
                                bot: bot,
                                channelId: channelId,
                                message: 'Database error when attempting to create the requestable. `' + err + '`'
                            });
                        })
                })
                .catch(err => {
                    botUtils.sendErrorMessage({
                        bot: bot,
                        channelId: channelId,
                        message: 'Database error on attempting to verify no existing request string. `' + err + '`'
                    });
                });
        }
    };
})();