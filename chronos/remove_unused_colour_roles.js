module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    function getAllColorRoles(server) { // [[ => array( roleIds ) ]]
        var colorRoles = [];
        for (let roleId in server.roles) {
            if (botUtils.isHexColorRole(server, roleId)) {
                colorRoles.push(roleId);
            }
        }
        return colorRoles;
    }

    function getAllUnusedRoles(server, colorRoles) { // [[ => array( roleIds ) ]]
        if (colorRoles.length === 0) {
            return [];
        }

        var unusedRoles = colorRoles;
        for (let memberId in server.members) {
            const member = server.members[memberId];
            let indicesToRemove = [];

            for (let index = 0; index < unusedRoles.length; ++index) {
                if (botUtils.doesMemberUseRole(member, unusedRoles[index])) {
                    indicesToRemove.push(index);
                }
            }

            for (let j = indicesToRemove.length - 1; j >= 0; --j) {
                unusedRoles.splice(j, 1);
            }

            if (unusedRoles.length === 0) {
                return [];
            }
        }

        return unusedRoles;
    }

    function sendErrorDeletingRole(bot, roleId, err) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: process.env.ADMIN_CHANNEL_ID,
            message: 'There was an error routinely deleting unused colour role \'' + roleId + '\'. `' + err + '`'
        });
    }

    function deleteUnusedRoles(bot, server, serverId, colorRoles) {
        for (let index = 0; index < colorRoles.length; ++index) {
            const roleId = colorRoles[index];
            const role = server.roles[roleId];
            console.log('[CHRONOS] remove unused colour roles: going to delete unused colour role \'%s\'', role.name);
            bot.deleteRole({
                serverID: serverId,
                roleID: roleId
            }, (err, response) => {
                if (err) {
                    sendErrorDeletingRole(bot, roleId, err);
                } else {
                    console.log('[CHRONOS] remove unused colour roles: \'%s\' deleted', role.name);
                }
            });
        }
    }

    return {
        name: 'remove unused colour roles',
        hourUtc: 0, // 8pm EST, 5pm PST
        canProcess: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                resolve({
                    ready: true
                });
            });
        },
        process: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                const serverId = bot.channels[process.env.HIJACK_CHANNEL_ID].guild_id;
                const server = bot.servers[serverId];

                var colorRoles = getAllColorRoles(server);
                colorRoles = getAllUnusedRoles(server, colorRoles);
                deleteUnusedRoles(bot, server, serverId, colorRoles);
                resolve(true);
            });
        }
    };
})();