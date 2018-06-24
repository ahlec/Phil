'use strict';

import {
    Channel as DiscordIOChannel,
    Member as DiscordIOMember,
    Role as DiscordIORole,
    Server as DiscordIOServer } from 'discord.io';
    import { QueryResult } from 'pg';
import { IPronoun, IServerConfig, IValidateResult } from 'phil';
import Database from './database';
import GlobalConfig from './global-config';
import { DEFAULT_PRONOUNS, getPronounFromRole } from './pronouns';
const discord = require('discord.io');

function doesRoleHavePermission(role : DiscordIORole, permission : number) : boolean {
    // TODO: Return to this function and determine if it's actually working?
    const binary = (role.permissions >>> 0).toString(2).split('');
    for (const strBit of binary) {
        const bit = parseInt(strBit);
        if (bit === permission) {
            return true;
        }
    }
    return false;
}

export default class ServerConfig implements IServerConfig {
    public static async getFromId(db: Database, server: DiscordIOServer, globalConfig: GlobalConfig): Promise<ServerConfig> {
        const results = await db.query('SELECT * FROM server_configs WHERE server_id = $1', [server.id]);
        if (results.rowCount === 0) {
            return null;
        }

        return new ServerConfig(server, globalConfig, results.rows[0]);
    }

    public readonly serverId: string;
    public readonly commandPrefix: string;
    public readonly botControlChannel: DiscordIOChannel;
    public readonly adminChannel: DiscordIOChannel;
    public readonly introductionsChannel: DiscordIOChannel;
    public readonly newsChannel: DiscordIOChannel;
    public readonly adminRole?: DiscordIORole;
    public readonly welcomeMessage: string;
    public readonly fandomMapLink: string;

    private constructor(public readonly server : DiscordIOServer,
        private readonly globalConfig : GlobalConfig,
        dbRow : any) {
        this.serverId = dbRow.server_id;
        this.commandPrefix = dbRow.command_prefix;
        this.botControlChannel = this.getChannel(dbRow.bot_control_channel_id);
        this.adminChannel = this.getChannel(dbRow.admin_channel_id);
        this.introductionsChannel = this.getChannel(dbRow.introductions_channel_id);
        this.newsChannel = this.getChannel(dbRow.news_channel_id);
        this.welcomeMessage = this.getOptionalString(dbRow.welcome_message);
        this.fandomMapLink = this.getOptionalString(dbRow.fandom_map_link);

        if (dbRow.admin_role_id) {
            this.adminRole = this.server.roles[dbRow.admin_role_id];
        }
    }

    public isAdmin(member: DiscordIOMember): boolean {
        for (const memberRoleId of member.roles) {
            if (this.adminRole && this.adminRole.id === memberRoleId) {
                return true;
            }

            const role = this.server.roles[memberRoleId];
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

    public isAdminChannel(channelId: string) : boolean {
        if (!channelId) {
            return false;
        }

        return (this.botControlChannel.id === channelId || this.adminChannel.id === channelId);
    }

    public getPronounsForMember(member: DiscordIOMember): IPronoun {
        for (const roleId of member.roles) {
            const role = this.server.roles[roleId];
            if (!role) {
                continue;
            }

            const pronoun = getPronounFromRole(role);
            if (pronoun) {
                return pronoun;
            }
        }

        return DEFAULT_PRONOUNS;
    }

    public validateCommandPrefix(commandPrefix: string): IValidateResult {
        if (!commandPrefix || commandPrefix.length === 0) {
            return {
                invalidReason: "A command prefix must be at least one character in length.",
                isValid: false
            };
        }

        if (commandPrefix.length > this.globalConfig.maxCommandPrefixLength) {
            return {
                invalidReason: "A command prefix cannot be longer than " + this.globalConfig.maxCommandPrefixLength + " characters.",
                isValid: false
            };
        }

        return {
            invalidReason: null,
            isValid: true
        };
    }

    private getChannel(channelId: string): DiscordIOChannel {
        if (channelId && this.server.channels[channelId]) {
            return this.server.channels[channelId];
        }

        const systemChannelId: string = (this.server as any).system_channel_id;
        if (this.server.channels[systemChannelId]) {
            return this.server.channels[systemChannelId];
        }

        return this.server.channels[0]; // If we don't have ANY channels, got a lot bigger problems.
    }

    private getOptionalString(str : string) : string | null {
        if (!str || str.length === 0) {
            return null;
        }

        return str;
    }
}
