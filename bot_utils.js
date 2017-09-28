module.exports = (function() {
    const discord = require('discord.io');
    const assert = require('assert');
    const url = require('url');
    const http = require('http');
    const https = require('https');

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
        getUrl: function(inputUrl) {
            const protocol = url.parse(inputUrl).protocol;
            if (protocol == 'http:') {
                return http.get(inputUrl);
            }

            if (protocol == 'https:') {
                return https.get(inputUrl);
            }

            console.error('Unknown protocol \'' + protocol + '\'');
            assert(false);
        },

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
        },

        sendHijackPrompt: function(bot, promptNumber, promptText, optionalChannelId) {
            if (typeof(optionalChannelId) === 'undefined') {
                optionalChannelId = process.env.HIJACK_CHANNEL_ID;
            }

            bot.sendMessage({
                to: optionalChannelId,
                message: ':snowflake: **HIJACK PROMPT OF THE DAY #' + promptNumber + '**: ' + promptText
            });
        },

        isPromptDisabled: function(db) {
            return new Promise((resolve, reject) => {
                db.query('SELECT count(*) FROM info WHERE key = \'prompt_disabled\' AND value = \'1\'')
                    .then(results => {
                        if (results.rows[0].count > 0) {
                            resolve(true);
                            return;
                        }
                        resolve(false);
                    });
            });
        },

        getRandomArrayEntry: function(arr) {
	        assert(typeof(arr) === 'object');
	        assert(Array.isArray(arr));
	        const randomIndex = Math.floor(Math.random() * arr.length);
            return arr[randomIndex];
        }
    }
})();