module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    return {
        publicRequiresAdmin: false,
        aliases: ['giveme'],
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            const serverId = bot.channels[channelId].guild_id;
            const server = bot.servers[serverId];

            if (commandArgs.length === 0) {
                db.query("SELECT request_string, role_id FROM requestable_roles")
                    .then(result => {
                        var requestables = {};
                        for (let index = 0; index < result.rowCount; ++index) {
                            if (requestables[result.rows[index].role_id] === undefined) {
                                requestables[result.rows[index].role_id] = [];
                            }
                            requestables[result.rows[index].role_id].push(result.rows[index].request_string);
                        }

                        var fullMessage = 'You must provide a valid requestable name of a role when using `' + process.env.COMMAND_PREFIX + 'request`. These are currently:\n';
                        for (let role_id in requestables) {
                            let requestStrings = requestables[role_id];
                            let role = server.roles[role_id];
                            fullMessage += '- ';

                            for (let index = 0; index < requestStrings.length; ++index) {
                                if (index > 0) {
                                    if (index < requestStrings.length - 1) {
                                        fullMessage += ', ';
                                    } else {
                                        fullMessage += ' or ';
                                    }
                                }

                                fullMessage += '`' + requestables[role_id][index] + '`';
                            }

                            fullMessage += ' to receive the "' + role.name + '" role\n';
                        }

                        botUtils.sendErrorMessage({
                            bot: bot,
                            channelId: channelId,
                            message: fullMessage
                        });
                    })
                    .catch(err => {
                        botUtils.sendErrorMessage({
                            bot: bot,
                            channelId: channelId,
                            message: 'Database error attempting to retrieve list of all requestables. `' + err + '`.'
                        });
                    });
                return;
            }

            db.query("SELECT role_id FROM requestable_roles WHERE request_string = $1", [commandArgs[0].toLowerCase()])
                .then(result => {
                    if (result.rowCount === 0) {
                        botUtils.sendErrorMessage({
                            bot: bot,
                            channelId: channelId,
                            message: 'There is no requestable role identified by the name of `' + commandArgs[0].toLowerCase() +
                                '`. Use `' + process.env.COMMAND_PREFIX + 'request` by itself to see a full list of valid requestable roles.'
                        });
                        return;
                    }

                    const roleId = result.rows[0].role_id;
                    const member = server.members[userId];

                    if (member.roles.indexOf(roleId) >= 0) {
                        const role = server.roles[roleId];
                        botUtils.sendErrorMessage({
                            bot: bot,
                            channelId: channelId,
                            message: 'You already have the `' + role.name + '` role.'
                        });
                        return;
                    }

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
                            const role = server.roles[roleId];
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
                        message: 'Database error when attempting to lookup the request string. `' + err + '`.'
                    });
                });
        }
    };
})();