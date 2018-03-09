'use strict';

import { Client as DiscordIOClient, Role as DiscordIORole } from 'discord.io';
import { MessageBuilder } from '../phil/message-builder';

export namespace DiscordPromises {

    export interface EditRoleOptions {
        name : string;
        color : string;
    }

    export function sendMessage(bot : DiscordIOClient, channelId : string, message : string) : Promise<string> {
        return new Promise((resolve, reject) => {
            bot.sendMessage({
                to: channelId,
                message: message
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response.id);
            });
        });
    }

    export async function sendMessageBuilder(bot : DiscordIOClient, channelId : string, messageBuilder : MessageBuilder) : Promise<string[]> {
        const messageIds = [];
        for (let message of messageBuilder.messages) {
            let messageId = await this.sendMessage(bot, channelId, message);
            messageIds.push(messageId);
        }

        return messageIds;
    }

    export function sendEmbedMessage(bot : DiscordIOClient, channelId : string, embedData : any) : Promise<string> {
        return new Promise((resolve, reject) => {
            bot.sendMessage({
                to: channelId,
                embed: embedData
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response.id);
            });
        });
    }

    export function editMessage(bot : DiscordIOClient, channelId : string, messageId : string, text : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            bot.editMessage({
                channelID: channelId,
                messageID: messageId,
                message: text
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }

    export function deleteMessage(bot : DiscordIOClient, channelId : string, messageId : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            bot.deleteMessage({
                channelID: channelId,
                messageID: messageId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }

    export function giveRoleToUser(bot : DiscordIOClient, serverId : string, userId : string, roleId : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            bot.addToRole({
                serverID: serverId,
                userID: userId,
                roleID: roleId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    export function takeRoleFromUser(bot : DiscordIOClient, serverId : string, userId : string, roleId : string) : Promise<any> {
        return new Promise((resolve, reject) => {
            bot.removeFromRole({
                serverID: serverId,
                userID: userId,
                roleID: roleId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }

    export function createRole(bot : DiscordIOClient, serverId : string) : Promise<DiscordIORole> {
        return new Promise((resolve, reject) => {
            bot.createRole(serverId, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response);
            });
        });
    }

    export function editRole(bot : DiscordIOClient, serverId : string, roleId : string, changes : EditRoleOptions) : Promise<void> {
        return new Promise((resolve, reject) => {
            bot.editRole({
                serverID: serverId,
                roleID: roleId,
                name: changes.name,
                color: changes.color,
                hoist: undefined,
                permissions: undefined,
                mentionable: undefined,
                position: undefined
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    export function deleteRole(bot : DiscordIOClient, serverId : string, roleId : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            bot.deleteRole({
                serverID: serverId,
                roleID: roleId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }

    export function pinMessage(bot : DiscordIOClient, channelId : string, messageId : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            bot.pinMessage({
                channelID: channelId,
                messageID: messageId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }
}
