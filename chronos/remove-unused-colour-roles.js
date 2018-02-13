'use strict';

const botUtils = require('../phil/utils');
const discord = require('../promises/discord');
const serverConfigs = require('../phil/server-configs');

function getAllColorRoles(server) { // [[ => array( roleIds ) ]]
    var colorRoles = [];
    for (let roleId in server.roles) {
        if (botUtils.isHexColorRole(server, roleId)) {
            colorRoles.push(roleId);
        }
    }

    return colorRoles;
}

function isRoleUnused(server, roleId) {
    for (let memberId in server.members) {
        if (botUtils.doesMemberUseRole(server.members[memberId], roleId)) {
            return false;
        }
    }

    return true;
}

function sendDeletedRolesReport(bot, channelId, deletedRoles) {
    var message = 'The follow colour role(s) have been removed automatically because I could not find any users on your server who were still using them:\n';

    for (let roleInfo of deletedRoles) {
        message += '\n\t' + roleInfo.name + ' (ID: ' + roleInfo.id + ')';
    }

    return discord.sendEmbedMessage(bot, channelId, {
        color: 0xB0E0E6,
        title: ':scroll: Unused Colour Roles Removed',
        description: message
    });
}

function reportDeletedRoles(bot, db, serverId, deletedRoles) {
    if (deletedRoles.length === 0) {
        return;
    }

    return serverConfigs.getFromId(bot, db, serverId)
        .then(serverConfig => sendDeletedRolesReport(bot, serverConfig.botControlChannelId, deletedRoles));
}

function deleteUnusedRoles(bot, db, server, serverId, colorRoles) {
    var latestPromise = Promise.resolve();
    const deletedRoles = [];
    for (let roleId of colorRoles) {
        const roleName = server.roles[roleId].name;
        latestPromise = latestPromise
            .then(() => discord.deleteRole(bot, serverId, roleId))
            .then(() => {
                deletedRoles.push({
                    id: roleId,
                    name: roleName
                });
            });
    }

    return latestPromise.then(() => reportDeletedRoles(bot, db, serverId, deletedRoles));
}

module.exports = function(bot, db, serverId, now) {
    const server = bot.servers[serverId];

    return Promise.resolve(server)
        .then(getAllColorRoles)
        .then(colorRoles => colorRoles.filter(roleId => isRoleUnused(server, roleId)))
        .then(colorRoles => deleteUnusedRoles(bot, db, server, serverId, colorRoles));
};
