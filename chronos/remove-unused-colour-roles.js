'use strict';

const botUtils = require('../phil/utils');
const discord = require('../promises/discord');

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

function reportDeletingRole(bot, roleName) {
    console.log('[CHRONOS] remove unused colour roles: \'%s\' deleted', roleName);
}

function deleteUnusedRoles(bot, server, serverId, colorRoles) {
    var latestPromise = Promise.resolve();
    for (let roleId of colorRoles) {
        const roleName = server.roles[roleId].name;
        latestPromise = latestPromise
            .then(() => discord.deleteRole(bot, serverId, roleId))
            .then(() => reportDeletingRole(bot, roleName));
    }

    return latestPromise;
}

module.exports = {
    name: 'remove unused colour roles',
    hourUtc: 0, // 8pm EST, 5pm PST

    canProcess: function(chronosManager, now, bot, db) {
        return Promise.resolve({ready: true});
    },

    process: function(chronosManager, now, bot, db) {
        const serverId = bot.channels[process.env.HIJACK_CHANNEL_ID].guild_id;
        const server = bot.servers[serverId];

        return Promise.resolve(server)
            .then(getAllColorRoles)
            .then(colorRoles => colorRoles.filter(roleId => isRoleUnused(server, roleId)))
            .then(colorRoles => deleteUnusedRoles(bot, server, serverId, colorRoles))
            .then(() => true);
    }
};
