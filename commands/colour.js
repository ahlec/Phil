module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');
    const util = require('util');

    const decemberLinks = [
        'http://www.december.com/html/spec/color0.html',
        'http://www.december.com/html/spec/color1.html',
        'http://www.december.com/html/spec/color2.html',
        'http://www.december.com/html/spec/color3.html',
        'http://www.december.com/html/spec/color4.html',
    ];

    function sendNoArgsProvidedError(bot, channelId) {
        const decemberLink = botUtils.getRandomArrayEntry(decemberLinks);
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: 'You must provide a hex code to this function of the colour that you\'d like to use. For example, `' + process.env.COMMAND_PREFIX + 'color #FFFFFF`. You could try checking out ' + decemberLink + ' for some codes.'
        });
    }

    function isValidHexColor(input) {
        return /^#[0-9A-F]{6}$/i.test(input);
    }

    function sendInvalidHexCodeError(bot, channelId, input) {
        const decemberLink = botUtils.getRandomArrayEntry(decemberLinks);
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: '`' + input + '` isn\'t a valid hex code. I\'m looking for it in the format of `#RRGGBB`. You can try checking out ' + decemberLink + ' for some amazing colours.'
        });
    }

    function sendCreateRoleError(bot, channelId, err) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: 'I wasn\'t able to create the colour as a role on the server. `' + err + '`'
        });
    }

    function sendEditRoleError(bot, channelId, err) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: 'I had trouble editing the role I just created. `' + err + '`'
        });
    }

    function getOrCreateColorRole(bot, channelId, hexColor) {
        return new Promise((resolve, reject) => {
            const serverId = bot.channels[channelId].guild_id;
            const server = bot.servers[serverId];
            for (let roleId in server.roles) {
                if (server.roles[roleId] === hexColor) {
                    resolve(roleId);
                    return;
                }
            }

            bot.createRole(serverId, (createErr, response) => {
                if (createErr) {
                    sendCreateRoleError(bot, channelId, createErr);
                    return;
                }

                var roleId = response.id;
                bot.editRole({
                    serverID: serverId,
                    roleID: roleId,
                    name: hexColor,
                    color: hexColor
                }, (editErr, editResponse) => {
                    if (editErr) {
                        sendEditRoleError(bot, channelId, editErr);
                    } else {
                        resolve(roleId);
                    }
                });
            });
        });
    }

    function isHexColorRole(server, roleId) {
        const role = server.roles[roleId];
        const isHex = isValidHexColor(role.name);
	    console.log('role %s is hex? %d', role.name, isHex);
        return isHex;
    }

    function sendRemoveRoleError(bot, channelId, err) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: 'There was a problem when I tried to remove your previous colour role. `' + err + '`'
        });
    }

    function removeRoleFromUserAsPromise(bot, serverId, userId, roleId) {
        return new Promise((resolve, reject) => {
            console.log('going to remove role %d from user %d', roleId, userId);
            bot.removeFromRole({
                serverID: serverId,
                userID: userId,
                roleID: roleId
            }, (err, response) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    function removeCurrentColorRole(bot, channelId, userId) {
        return new Promise((resolve, reject) => {
            const serverId = bot.channels[channelId].guild_id;
            const server = bot.servers[serverId];
            const member = server.members[userId];
            var latestRoleRemovalPromise;
            for (let index = 0; index < member.roles.length; ++index) {
                let roleId = member.roles[index];
                if (isHexColorRole(server, roleId)) {
                    if (latestRoleRemovalPromise) {
                        latestRoleRemovalPromise = latestRoleRemovalPromise.then(removeRoleFromUserAsPromise(bot, serverId, userId, roleId));
                    } else {
                        latestRoleRemovalPromise = removeRoleFromUserAsPromise(bot, serverId, userId, roleId);
                    }
                }
            }

            if (latestRoleRemovalPromise) {
                latestRoleRemovalPromise.then(function() {
                    resolve();
                }).catch(err => {
                    sendRemoveRoleError(bot, channelId, err);
                });
            } else {
                resolve();
            }
        });
    }

    function sendSetColorRoleError(bot, channelId, err) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: 'There was a problem I tried giving you your new role. `' + err + '`'
        });
    }

    function setColorRole(bot, channelId, userId, roleId) {
        return new Promise((resolve, reject) => {
            const serverId = bot.channels[channelId].guild_id;
            bot.addToRole({
                serverID: serverId,
                userID: userId,
                roleID: roleId
            }, (err, response) => {
                if (err) {
                    sendSetColorRoleError(bot, channelId, err);
                } else {
                    resolve();
                }
            });
        });
    }

    const compliments = [
        'That\'s a really pretty colour, too.',
        'It looks excellent on you.',
        'That\'s a phenomenal choice.',
        'That\'s sure to stand out and turn some heads.',
        'I really love that shade, by the way.',
        'It\'s absolutely beautiful.'
    ];

    function sendColorChangeSuccess(bot, channelId, hexColor) {
        const randomIndex = Math.floor(Math.random() * compliments.length);
        const compliment = compliments[randomIndex];

        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: 'Your colour has been changed to **' + hexColor + '**. ' + compliment
        });
    }

    return {
        publicRequiresAdmin: false,
        aliases: ['color'],
        helpDescription: 'Asks Phil to change your username colour to a hex code of your choosing.',
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            if (commandArgs.length === 0) {
                sendNoArgsProvidedError(bot, channelId);
                return;
            }

            var hexColor = commandArgs[0];
            if (!isValidHexColor(hexColor)) {
                sendInvalidHexCodeError(bot, channelId, hexColor);
                return;
            }
            hexColor = hexColor.toUpperCase();

            getOrCreateColorRole(bot, channelId, hexColor)
                .then(roleId => {
                    removeCurrentColorRole(bot, channelId, userId)
                        .then(function() {
                            setColorRole(bot, channelId, userId, roleId)
                                .then(function() {
                                    sendColorChangeSuccess(bot, channelId, hexColor);
                                });
                        });
                });
        }
    };
})();