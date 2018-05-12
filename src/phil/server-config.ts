'use strict';

import { Server as DiscordIOServer, Channel as DiscordIOChannel, Role as DiscordIORole, Member as DiscordIOMember } from 'discord.io';
import { Database } from './database';
import { QueryResult } from 'pg';
import { GlobalConfig } from './global-config';
const discord = require('discord.io');


interface IValidateResult {
    isValid : boolean;
    invalidReason : string | null;
}

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

export class ServerConfig {
    readonly serverId : string;
    readonly commandPrefix : string;
    readonly botControlChannel : DiscordIOChannel;
    readonly adminChannel : DiscordIOChannel;
    readonly introductionsChannel : DiscordIOChannel;
    readonly newsChannel : DiscordIOChannel;
    readonly adminRole? : DiscordIORole;

    private constructor(public readonly server : DiscordIOServer,
        private readonly globalConfig : GlobalConfig,
        dbRow : any) {
        this.serverId = dbRow.server_id;
        this.commandPrefix = dbRow.command_prefix;
        this.botControlChannel = this.getChannel(dbRow.bot_control_channel_id);
        this.adminChannel = this.getChannel(dbRow.admin_channel_id);
        this.introductionsChannel = this.getChannel(dbRow.introductions_channel_id);
        this.newsChannel = this.getChannel(dbRow.news_channel_id);

        if (dbRow.admin_role_id) {
            this.adminRole = this.server.roles[dbRow.admin_role_id];
        }
    }

    static async getFromId(db : Database, server : DiscordIOServer, globalConfig : GlobalConfig) : Promise<ServerConfig> {
        const results = await db.query('SELECT * FROM server_configs WHERE server_id = $1', [server.id]);
        if (results.rowCount === 0) {
            return null;
        }

        return new ServerConfig(server, globalConfig, results.rows[0]);
    }

    isAdmin(member : DiscordIOMember) : boolean {
        for (let memberRoleId of member.roles) {
            if (this.adminRole && this.adminRole.id === memberRoleId) {
                return true;
            }

            let role = this.server.roles[memberRoleId];
            if (doesRoleHavePermission(role, discord.Permissions.GENERAL_ADMINISTRATOR)) {
                return true;
            }
        }

        // Check @everyone role
        if (doesRoleHavePermission(this.server.roles[this.server.id], discord.Permissions.GENERAL_ADMINISTRATOR)) {
            return true;
        }

        // The owner of the server is also an admin
        return (this.server.owner_id === member.id);
    }

    isAdminChannel(channelId : string) : boolean {
        if (!channelId) {
            return false;
        }

        return (this.botControlChannel.id === channelId
            || this.adminChannel.id === channelId);
    }

    validateCommandPrefix(commandPrefix : string) : IValidateResult {
        if (!commandPrefix || commandPrefix.length === 0) {
            return {
                isValid: false,
                invalidReason: "A command prefix must be at least one character in length."
            };
        }

        if (commandPrefix.length > this.globalConfig.maxCommandPrefixLength) {
            return {
                isValid: false,
                invalidReason: "A command prefix cannot be longer than " + this.globalConfig.maxCommandPrefixLength + " characters."
            };
        }

        return {
            isValid: true,
            invalidReason: null
        };
    }

    private getChannel(channelId : string) : DiscordIOChannel {
        if (channelId && this.server.channels[channelId]) {
            return this.server.channels[channelId];
        }

        const systemChannelId : string = (this.server as any).system_channel_id;
        if (this.server.channels[systemChannelId]) {
            return this.server.channels[systemChannelId];
        }

        return this.server.channels[0]; // If we don't have ANY channels, got a lot bigger problems.
    }
}
