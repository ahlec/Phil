module.exports = (function() {
    const discord = require('discord.io');
    const assert = require('assert');
    const url = require('url');
    const http = require('http');
    const https = require('https');

    // -------------------------------- PRONOUNS
    const PRONOUNS = {
        HE: 0,
        SHE: 1,
        THEY: 2
    };

    const PRONOUN_CASES = {
        HE: 0,
        HIM: 1,
        HIS: 2
    };

    const HE_PRONOUNS = {
        [PRONOUN_CASES.HE]: 'he',
        [PRONOUN_CASES.HIM]: 'him',
        [PRONOUN_CASES.HIS]: 'his'
    };

    const SHE_PRONOUNS = {
        [PRONOUN_CASES.HE]: 'she',
        [PRONOUN_CASES.HIM]: 'her',
        [PRONOUN_CASES.HIS]: 'hers'
    };

    const THEY_PRONOUNS = {
        [PRONOUN_CASES.HE]: 'they',
        [PRONOUN_CASES.HIM]: 'them',
        [PRONOUN_CASES.HIS]: 'theirs'
    };

    const PRONOUN_ARRAYS = {
        [PRONOUNS.HE]: HE_PRONOUNS,
        [PRONOUNS.SHE]: SHE_PRONOUNS,
        [PRONOUNS.THEY]: THEY_PRONOUNS
    };

    const PRONOUNS_FROM_ROLE_ID = {
        [process.env.HE_PRONOUNS_ROLE_ID]: PRONOUNS.HE,
        [process.env.SHE_PRONOUNS_ROLE_ID]: PRONOUNS.SHE,
        [process.env.THEY_PRONOUNS_ROLE_ID]: PRONOUNS.THEY
    }

    // ------------------------------------------ INTERNAL FUNCTIONS

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

    function _doesMemberUseRole(member, roleId) {
        for (let index = 0; index < member.roles.length; ++index) {
            if (member.roles[index] === roleId) {
                return true;
            }
        }

        return false;
    }

    function _isValidHexColor(input) {
        return /^#[0-9A-F]{6}$/i.test(input);
    }

    function _resolveMultiplePronounsToSinglePronoun(pronouns) {
        if (pronouns.length === 0) {
            return PRONOUNS.THEY;
        }

        if (pronouns.length === 1) {
            return PRONOUNS_FROM_ROLE_ID[pronouns[0]];
        }

        if (pronouns.indexOf(PRONOUNS.THEY) >= 0) {
            return PRONOUNS.THEY;
        }

        // Hmmm... What do I do in the case where the user has HE and SHE but not THEY?
        // For right now, we'll go with 'They' until someone clarifies.
        return PRONOUNS.THEY;
    }

    return {
        PRONOUNS: PRONOUNS,
        PRONOUN_CASES, PRONOUN_CASES,

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

        doesMemberUseRole: _doesMemberUseRole,

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

        getRandomArrayEntry: function(arr) {
            assert(typeof(arr) === 'object');
            assert(Array.isArray(arr));
            const randomIndex = Math.floor(Math.random() * arr.length);
            return arr[randomIndex];
        },

        isValidHexColor: _isValidHexColor,

        isHexColorRole: function(server, roleId) {
            const role = server.roles[roleId];
            const isHex = _isValidHexColor(role.name);
            return isHex;
        },

        getPronounForUser: function(bot, userId) {
            const serverId = bot.channels[process.env.HIJACK_CHANNEL_ID].guild_id;
            const server = bot.servers[serverId];
            const member = server.members[userId];
            const pronounsOfUser = [];

            for (let index = 0; index < member.roles.length; ++index) {
                const roleId = member.roles[index];
                if (roleId in PRONOUNS_FROM_ROLE_ID) {
                    pronounsOfUser.push(roleId);
                }
            }

            return _resolveMultiplePronounsToSinglePronoun(pronounsOfUser);
        },

        getPronounOfCase: function(pronoun, pronounCase) {
            const pronounArray = PRONOUN_ARRAYS[pronoun];
            assert(typeof(pronounArray) === 'object');
            const pronounStr = pronounArray[pronounCase];
            assert(typeof(pronounStr) === 'string');
            return pronounStr;
        },

        isPromise: function(obj) {
            if (typeof(obj) !== 'object') {
                return false;
            }

            if (typeof(obj.then) !== 'function') {
                return false;
            }

            return true;
        },

        isNumeric: function(input) {
            return ( !isNaN(parseInt(input)) && isFinite(input) );
        },

        isAdminChannel: function(channelId) {
            return (channelId === process.env.BOT_CONTROL_CHANNEL_ID || channelId === process.env.ADMIN_CHANNEL_ID);
        },

        isSameDay: function(dateA, dateB) {
            if (dateA.getUTCFullYear() !== dateB.getUTCFullYear()) {
                return false;
            }

            if (dateA.getUTCMonth() !== dateB.getUTCMonth()) {
                return false;
            }

            return (dateA.getUTCDate() === dateB.getUTCDate());
        },

        stitchTogetherArray: function(values) {
            var str = '';
            for (let index = 0; index < values.length; ++index) {
                if (index > 0) {
                    if (index < values.length - 1) {
                        str += ', ';
                    } else {
                        str += ' or ';
                    }
                }

                str += '`' + values[index] + '`';
            }

            return str;
        },

        getUserDisplayName: function(bot, serverId, userId) {
            const server = bot.servers[serverId];
            assert(server);

            const user = bot.users[userId];
            const member = server.members[userId];

            if (!user || !member) {
                return null;
            }

            if (member.nick) {
                return member.nick;
            }

            return user.username;
        }
    }
})();
