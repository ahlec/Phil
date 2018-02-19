'use strict';

import { Client as DiscordIOClient } from 'discord.io';

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
