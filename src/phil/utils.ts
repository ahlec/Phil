const discord = require('discord.io');
const assert = require('assert');
const url = require('url');
const http = require('http');
const https = require('https');

import { Client as DiscordIOClient, Member as DiscordIOMember, Server as DiscordIOServer, Role as DiscordIORole } from 'discord.io';
import { DiscordPromises } from '../promises/discord';

// ------------------------------------------ INTERNAL FUNCTIONS

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

    static isHexColorRole(role : DiscordIORole) : boolean {
        const isHex = BotUtils.isValidHexColor(role.name);
        return isHex;
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
