'use strict';

import { Client as DiscordIOClient, Role as DiscordIORole } from 'discord.io';
import { MessageBuilder } from '../phil/message-builder';

class DiscordPromises {
    sendMessage(bot : DiscordIOClient, channelId : string, message : string) : Promise<string> {
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

    async sendMessageBuilder(bot : DiscordIOClient, channelId : string, messageBuilder : MessageBuilder) : Promise<string[]> {
        const messageIds = [];
        for (let message of messageBuilder.messages) {
            let messageId = await this.sendMessage(bot, channelId, message);
            messageIds.push(messageId);
        }

        return messageIds;
    }

    sendEmbedMessage(bot : DiscordIOClient, channelId : string, embedData : any) : Promise<string> {
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

    editMessage(bot : DiscordIOClient, channelId : string, messageId : string, text : string) : Promise<void> {
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

    deleteMessage(bot : DiscordIOClient, channelId : string, messageId : string) : Promise<void> {
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

    giveRoleToUser(bot : DiscordIOClient, serverId : string, userId : string, role : DiscordIORole) : Promise<any> {
        return new Promise((resolve, reject) => {
            bot.addToRole({
                serverID: serverId,
                userID: userId,
                roleID: role.id
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }

    takeRoleFromUser(bot : DiscordIOClient, serverId : string, userId : string, role : DiscordIORole) : Promise<any> {
        return new Promise((resolve, reject) => {
            bot.removeFromRole({
                serverID: serverId,
                userID: userId,
                roleID: role.id
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }

    deleteRole(bot : DiscordIOClient, serverId : string, roleId : string) : Promise<void> {
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

    pinMessage(bot : DiscordIOClient, channelId : string, messageId : string) : Promise<void> {
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

export const instance : DiscordPromises = new DiscordPromises();
