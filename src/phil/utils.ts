const discord = require('discord.io');
const assert = require('assert');
const url = require('url');
const http = require('http');
const https = require('https');

import { Client as DiscordIOClient, Member as DiscordIOMember, Server as DiscordIOServer, Role as DiscordIORole } from 'discord.io';
import { DiscordPromises } from '../promises/discord';

// -------------------------------- PRONOUNS
export enum Pronoun {
    He = 0,
    She = 1,
    They = 2
};

export enum PronounCase {
    He = 0,
    Him = 1,
    His = 2
};

const HE_PRONOUNS = {
    [PronounCase.He]: 'he',
    [PronounCase.Him]: 'him',
    [PronounCase.His]: 'his'
};

const SHE_PRONOUNS = {
    [PronounCase.He]: 'she',
    [PronounCase.Him]: 'her',
    [PronounCase.His]: 'hers'
};

const THEY_PRONOUNS = {
    [PronounCase.He]: 'they',
    [PronounCase.Him]: 'them',
    [PronounCase.His]: 'theirs'
};

const PRONOUN_ARRAYS = {
    [Pronoun.He]: HE_PRONOUNS,
    [Pronoun.She]: SHE_PRONOUNS,
    [Pronoun.They]: THEY_PRONOUNS
};

const PRONOUNS_FROM_ROLE_ID = {
    [process.env.HE_PRONOUNS_ROLE_ID]: Pronoun.He,
    [process.env.SHE_PRONOUNS_ROLE_ID]: Pronoun.She,
    [process.env.THEY_PRONOUNS_ROLE_ID]: Pronoun.They
};

// ------------------------------------------ INTERNAL FUNCTIONS

function doesRoleHavePermission(role : DiscordIORole, permission : number) : boolean {
    // TODO: Return to this function and determine if it's actually working?
    var binary = (role.permissions >>> 0).toString(2).split('');
    for (let strBit of binary) {
        let bit = parseInt(strBit);
        if (bit === permission) {
            return true;
        }
    }
    return false;
}

function _resolveMultiplePronounsToSinglePronoun(pronouns : Pronoun[]) : Pronoun {
    if (pronouns.length === 0) {
        return Pronoun.They;
    }

    if (pronouns.length === 1) {
        return PRONOUNS_FROM_ROLE_ID[pronouns[0]];
    }

    if (pronouns.indexOf(Pronoun.They) >= 0) {
        return Pronoun.They;
    }

    // Hmmm... What do I do in the case where the user has HE and SHE but not THEY?
    // For right now, we'll go with 'They' until someone clarifies.
    return Pronoun.They;
}

interface SendErrorMessageOpts {
    readonly bot : DiscordIOClient;
    readonly channelId : string;
    readonly message : string;
}

interface SendSuccessMessageOpts {
    readonly bot : DiscordIOClient;
    readonly channelId : string;
    readonly message : string;
}

export class BotUtils {
    static getUrl(inputUrl : string) : string {
        const protocol = url.parse(inputUrl).protocol;
        if (protocol === 'http:') {
            return http.get(inputUrl);
        }

        if (protocol === 'https:') {
            return https.get(inputUrl);
        }

        throw new Error('Unknown protocol \'' + protocol + '\'');
    }

    static sendErrorMessage(options : SendErrorMessageOpts) : Promise<string> {
        let message = ':no_entry: **ERROR.** ' + options.message;
        return DiscordPromises.sendMessage(options.bot, options.channelId, message);
    }

    static sendSuccessMessage(options : SendSuccessMessageOpts) : Promise<string> {
        let message = ':white_check_mark: **SUCCESS.** ' + options.message;
        return DiscordPromises.sendMessage(options.bot, options.channelId, message);
    }

    static doesMemberUseRole(member : DiscordIOMember, roleId : string) : boolean {
        for (let memberRoleId of member.roles) {
            if (memberRoleId === roleId) {
                return true;
            }
        }

        return false;
    }

    static isMemberAnAdminOnServer(member : DiscordIOMember, server : DiscordIOServer) : boolean {
        for (let memberRoleId of member.roles) {
            if (memberRoleId === process.env.ADMIN_ROLE_ID) {
                return true;
            }

            let role = server.roles[memberRoleId];
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
    }

    static toStringDiscordError(err : any) : string {
        if (err.response) {
            return '[Code ' + err.response.code + ': ' + err.response.message + ']';
        }

        return err.toString();
    }

    static getRandomArrayEntry<T>(arr : T[]) : T {
        const randomIndex = Math.floor(Math.random() * arr.length);
        return arr[randomIndex];
    }

    static isValidHexColor(input : string) : boolean {
        return /^#[0-9A-F]{6}$/i.test(input);
    }

    static isHexColorRole(server : DiscordIOServer, roleId : string) : boolean {
        const role = server.roles[roleId];
        const isHex = BotUtils.isValidHexColor(role.name);
        return isHex;
    }

    static getPronounForUser(bot : DiscordIOClient, userId : string) : Pronoun {
        const serverId = bot.channels[process.env.HIJACK_CHANNEL_ID].guild_id;
        const server = bot.servers[serverId];
        const member = server.members[userId];
        const pronounsOfUser : Pronoun[] = [];

        for (let memberRoleId of member.roles) {
            let pronoun = PRONOUNS_FROM_ROLE_ID[memberRoleId];
            if (pronoun) {
                pronounsOfUser.push(pronoun);
            }
        }

        return _resolveMultiplePronounsToSinglePronoun(pronounsOfUser);
    }

    static getPronounOfCase(pronoun : Pronoun, pronounCase : PronounCase) : string {
        const pronounArray = PRONOUN_ARRAYS[pronoun];
        const pronounStr = pronounArray[pronounCase];
        return pronounStr;
    }

    static isPromise(obj : any) : boolean {
        if (typeof(obj) !== 'object') {
            return false;
        }

        if (typeof(obj.then) !== 'function') {
            return false;
        }

        return true;
    }

    static isNumeric(input : string) : boolean {
        const numInput = parseInt(input, 10);
        if (isNaN(numInput) || !isFinite(numInput)) {
            return false;
        }

        return (numInput.toString(10) === input);
    }

    static isAdminChannel(channelId : string) : boolean {
        return (channelId === process.env.BOT_CONTROL_CHANNEL_ID || channelId === process.env.ADMIN_CHANNEL_ID);
    }

    static isSameDay(dateA : Date, dateB : Date) : boolean {
        if (dateA.getUTCFullYear() !== dateB.getUTCFullYear()) {
            return false;
        }

        if (dateA.getUTCMonth() !== dateB.getUTCMonth()) {
            return false;
        }

        return (dateA.getUTCDate() === dateB.getUTCDate());
    }

    static stitchTogetherArray(values : string[]) : string {
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
    }

    static getUserDisplayName(bot : DiscordIOClient, serverId : string, userId : string) : string {
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
};
