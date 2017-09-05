module.exports = (function() {
    const discord = require('discord.io');
    const assert = require('assert');

    function isRoleAnAdminRole(role) {
        var binary = (role.permissions >>> 0).toString(2).split('');
        var hasAdminPermission = false;
        for (let index = 0; index < binary.length; ++index) {
            let bit = binary[index];
            if (bit === discord.Permissions.GENERAL_ADMINISTRATOR) {
                return true;
            }
        }
        return false;
    }

    return {
        sendErrorMessage: function(options) {
            assert(typeof(options) === 'object');
            assert(options.bot !== undefined);
            assert(options.channelId !== undefined);
            assert(typeof(options.message) === 'string');

            options.bot.sendMessage({
                to: options.channelId,
                message: ':no_entry: **ERROR.** ' + options.message
            });
        },

        sendSuccessMessage: function(options) {
            assert(typeof(options) === 'object');
            assert(options.bot !== undefined);
            assert(options.channelId !== undefined);
            assert(typeof(options.message) === 'string');

            options.bot.sendMessage({
                to: options.channelId,
                message: ':white_check_mark: **SUCCESS.** ' + options.message
            });
        },

        isMemberAnAdminOnServer: function(member, server) {
            for (let index = 0; index < member.roles.length; ++index) {
                let role = server.roles[member.roles[index]];
                if (isRoleAnAdminRole(role)) {
                    return true;
                }
            }

            // Check @everyone role
            if (isRoleAnAdminRole(server.roles[server.id])) {
                return true;
            }

            // The owner of the server is also an admin
            return (server.owner_id === member.id);
        }
    }
})();