module.exports = (function() {
    'use strict';

    const botUtils = require('../phil/utils');
    const helpGroups = require('../phil/help-groups');
    const util = require('util');

    const decemberLinks = [
        'http://www.december.com/html/spec/color0.html',
        'http://www.december.com/html/spec/color1.html',
        'http://www.december.com/html/spec/color2.html',
        'http://www.december.com/html/spec/color3.html',
        'http://www.december.com/html/spec/color4.html',
    ];

    const compliments = [
        'That\'s a really pretty colour, too.',
        'It looks excellent on you.',
        'That\'s a phenomenal choice.',
        'That\'s sure to stand out and turn some heads.',
        'I really love that shade, by the way.',
        'It\'s absolutely beautiful.'
    ];

    function getHexColorFromCommandArgs(commandArgs) {
        const decemberLink = botUtils.getRandomArrayEntry(decemberLinks);

        if (commandArgs.length === 0) {
            return Promise.reject('You must provide a hex code to this function of the colour that you\'d like to use. For example, `' + process.env.COMMAND_PREFIX + 'color #FFFFFF`. You could try checking out ' + decemberLink + ' for some codes.');
        }

        var hexColor = commandArgs[0];
        if (!botUtils.isValidHexColor(hexColor)) {
            return Promise.reject('`' + hexColor + '` isn\'t a valid hex code. I\'m looking for it in the format of `#RRGGBB`. You can try checking out ' + decemberLink + ' for some amazing colours.');
        }

        hexColor = hexColor.toUpperCase();
        return hexColor;
    }

    function updateNewColorRole(resolve, reject, bot, serverId, roleId, hexColor) {
        bot.editRole({
            serverID: serverId,
            roleID: roleId,
            name: hexColor,
            color: hexColor
        }, (editErr, editResponse) => {
            if (editErr) {
                reject('I had trouble editing the role I just created. `' + editErr + '`');
            } else {
                console.log('Role %d successfully edited into %s', roleId, hexColor);
                resolve({
                    roleId: roleId,
                    hexColor: hexColor
                });
            }
        });
    }

    function createColorRole(resolve, reject, bot, serverId, hexColor) {
        bot.createRole(serverId, (createErr, response) => {
            if (createErr) {
                reject('I wasn\'t able to create the colour as a role on the server. `' + createErr + '`');
                return;
            }

            const roleId = response.id;
            console.log('New role created with roleId = %d', roleId);
            updateNewColorRole(resolve, reject, bot, serverId, roleId, hexColor);
        });
    }

    function getColorRoleData(bot, channelId, hexColor) {
        const serverId = bot.channels[channelId].guild_id;
        const server = bot.servers[serverId];
        for (let roleId in server.roles) {
            if (server.roles[roleId].name === hexColor) {
                return {
                    roleId: roleId,
                    hexColor: hexColor
                };
            }
        }

        return new Promise((resolve, reject) => createColorRole(resolve, reject, bot, serverId, hexColor));
    }

    function removeRoleFromUser(bot, serverId, userId, roleId) {
        return new Promise((resolve, reject) => {
            console.log('going to remove role %d from user %d', roleId, userId);
            bot.removeFromRole({
                serverID: serverId,
                userID: userId,
                roleID: roleId
            }, (err, response) => {
                if (err) {
                    reject('There was a problem when I tried to remove your previous colour role. `' + err + '`');
                } else {
                    resolve();
                }
            });
        });
    }

    function removeCurrentColorRole(bot, channelId, userId, roleData) {
        const serverId = bot.channels[channelId].guild_id;
        const server = bot.servers[serverId];
        const member = server.members[userId];

        var latestRoleRemovalPromise = Promise.resolve();
        for (let index = 0; index < member.roles.length; ++index) {
            let removingRoleId = member.roles[index];
            if (!botUtils.isHexColorRole(server, removingRoleId)) {
                continue;
            }

            latestRoleRemovalPromise = latestRoleRemovalPromise.then(() => removeRoleFromUser(bot, serverId, userId, removingRoleId));
        }

        return latestRoleRemovalPromise.then(() => roleData);
    }

    function setColorRole(bot, channelId, userId, roleData) {
        return new Promise((resolve, reject) => {
            const serverId = bot.channels[channelId].guild_id;
            bot.addToRole({
                serverID: serverId,
                userID: userId,
                roleID: roleData.roleId
            }, (err, response) => {
                if (err) {
                    reject('There was a problem I tried giving you your new role. `' + err + '`');
                } else {
                    resolve(roleData);
                }
            });
        });
    }

    function sendColorChangeSuccess(bot, channelId, roleData) {
        const compliment = botUtils.getRandomArrayEntry(compliments);

        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: 'Your colour has been changed to **' + roleData.hexColor + '**. ' + compliment
        });
    }

    return {
        aliases: ['color'],

        helpGroup: helpGroups.Groups.Roles,
        helpDescription: 'Asks Phil to change your username colour to a hex code of your choosing.',
        versionAdded: 3,

        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return Promise.resolve()
                .then(() => getHexColorFromCommandArgs(commandArgs))
                .then(hexColor => getColorRoleData(bot, message.channelId, hexColor))
                .then(roleData => removeCurrentColorRole(bot, message.channelId, message.userId, roleData))
                .then(roleData => setColorRole(bot, message.channelId, message.userId, roleData))
                .then(roleData => sendColorChangeSuccess(bot, message.channelId, roleData));
        }
    };
})();
