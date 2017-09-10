module.exports = (function() {
    const discord = require('discord.io');
    const assert = require('assert');

    function doesRoleHavePermission(role, permission) {
        var binary = (role.permissions >>> 0).toString(2).split('');
        for (let index = 0; index < binary.length; ++index) {
            let bit = binary[index];
            if (bit === permission) {
                return true;
            }
        }
        return false;
    }

    function isNumeric(input) {
        return ( !isNaN(parseInt(input)) && isFinite(input) );
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
                if (member.roles[index] === process.env.ADMIN_ROLE_ID) {
                    return true;
                }

                let role = server.roles[member.roles[index]];
                if (doesRoleHavePermission(role, discord.Permissions.GENERAL_ADMINISTRATOR)) {
                    return true;
                }
            }

            // Check @everyone role
            if (doesRoleHavePermission(server.roles[server.id], discord.Permissions.GENERAL_ADMINISTRATOR)) {
                return true;
            }

            // The owner of the server is also an admin
            return (server.owner_id === member.id);
        },

        toStringDiscordError: function(err) {
            if (err.response) {
                return '[Code ' + err.response.code + ': ' + err.response.message + ']';
            }
            return err.toString();
        },

        parseConfirmRejectArgument: function(arg) {
            if (arg === '') {
                return [];
            }

            if (isNumeric(arg)) {
                return [parseInt(arg)];
            }

            const separatedPieces = arg.split('-');
            if (separatedPieces.length === 2) {
                if (!isNumeric(separatedPieces[0]) || !isNumeric(separatedPieces[1])) {
                    return [];
                }

                const lowerBound = parseInt(separatedPieces[0]);
                const upperBound = parseInt(separatedPieces[1]);
                if (upperBound < lowerBound) {
                    return [];
                }

                var includedNumbers = [];
                for (let num = lowerBound; num <= upperBound; ++num) {
                    includedNumbers.push(num);
                }
                return includedNumbers;
            }

            return [];
        }
    }
})();