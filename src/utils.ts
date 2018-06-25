const url = require('url');
const http = require('http');
const https = require('https');

import { Client as DiscordIOClient,
         Member as DiscordIOMember,
         Role as DiscordIORole,
         Server as DiscordIOServer,
         User as DiscordIOUser } from 'discord.io';
import { DiscordPromises } from 'promises/discord';

interface ISendErrorMessageOpts {
    readonly bot: DiscordIOClient;
    readonly channelId: string;
    readonly message: string;
}

interface ISendSuccessMessageOpts {
    readonly bot: DiscordIOClient;
    readonly channelId: string;
    readonly message: string;
}

export namespace BotUtils {
    export function getUrl(inputUrl: string): string {
        const protocol = url.parse(inputUrl).protocol;
        if (protocol === 'http:') {
            return http.get(inputUrl);
        }

        if (protocol === 'https:') {
            return https.get(inputUrl);
        }

        throw new Error('Unknown protocol \'' + protocol + '\'');
    }

    export function sendErrorMessage(options : ISendErrorMessageOpts): Promise<string> {
        const message = ':no_entry: **ERROR.** ' + options.message;
        return DiscordPromises.sendMessage(options.bot, options.channelId, message);
    }

    export function sendSuccessMessage(options: ISendSuccessMessageOpts): Promise<string> {
        const message = ':white_check_mark: **SUCCESS.** ' + options.message;
        return DiscordPromises.sendMessage(options.bot, options.channelId, message);
    }

    export function doesMemberUseRole(member: DiscordIOMember, roleId: string): boolean {
        for (const memberRoleId of member.roles) {
            if (memberRoleId === roleId) {
                return true;
            }
        }

        return false;
    }

    export function toStringDiscordError(err: any): string {
        if (err.response) {
            return '[Code ' + err.response.code + ': ' + err.response.message + ']';
        }

        return err.toString();
    }

    export function getRandomArrayEntry<T>(arr: ReadonlyArray<T>): T {
        const randomIndex = Math.floor(Math.random() * arr.length);
        return arr[randomIndex];
    }

    export function isValidHexColor(input: string): boolean {
        return /^#[0-9A-F]{6}$/i.test(input);
    }

    export function isHexColorRole(role: DiscordIORole): boolean {
        const isHex = BotUtils.isValidHexColor(role.name);
        return isHex;
    }

    export function isNumeric(input: string): boolean {
        const numInput = parseInt(input, 10);
        if (isNaN(numInput) || !isFinite(numInput)) {
            return false;
        }

        return (numInput.toString(10) === input);
    }

    export function isSameDay(dateA: Date, dateB: Date): boolean {
        if (dateA.getUTCFullYear() !== dateB.getUTCFullYear()) {
            return false;
        }

        if (dateA.getUTCMonth() !== dateB.getUTCMonth()) {
            return false;
        }

        return (dateA.getUTCDate() === dateB.getUTCDate());
    }

    export function stitchTogetherArray(values: ReadonlyArray<string>): string {
        let str = '';
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

    export function getUserDisplayName(user: DiscordIOUser, server: DiscordIOServer): string {
        if (!user) {
            return null;
        }

        const member = server.members[user.id];
        if (member && member.nick && member.nick.length > 0) {
            return member.nick;
        }

        return user.username;
    }
}

export default BotUtils;
