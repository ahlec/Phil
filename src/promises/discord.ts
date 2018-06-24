import { Client as DiscordIOClient, Role as DiscordIORole } from 'discord.io';
import { OfficialDiscordEmbed } from 'official-discord';
import MessageBuilder from '../phil/message-builder';
import Delay from '../phil/utils/delay';

declare interface IDiscordIOCallbackError {
	statusCode?: number,
	statusMessage?: string,
	response?: any
}

export namespace DiscordPromises {
    export interface IEditRoleOptions {
        name: string;
        color?: number;
    }

    export function sendMessage(bot: DiscordIOClient, channelId: string, message: string): Promise<string> {
        return new Promise((resolve, reject) => {
            bot.sendMessage({
                message,
                to: channelId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response.id);
            });
        });
    }

    export async function sendMessageBuilder(bot: DiscordIOClient, channelId: string, messageBuilder: MessageBuilder): Promise<string[]> {
        const messageIds = [];
        for (const message of messageBuilder.messages) {
            const messageId = await this.sendMessage(bot, channelId, message);
            messageIds.push(messageId);
        }

        return messageIds;
    }

    export function sendEmbedMessage(bot: DiscordIOClient, channelId: string, embedData: any): Promise<string> {
        return new Promise((resolve, reject) => {
            bot.sendMessage({
                embed: embedData,
                to: channelId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response.id);
            });
        });
    }

    export function editMessage(bot: DiscordIOClient, channelId: string, messageId: string, text: string): Promise<void> {
        return new Promise((resolve, reject) => {
            bot.editMessage({
                channelID: channelId,
                message: text,
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

    export function deleteMessage(bot: DiscordIOClient, channelId: string, messageId: string): Promise<void> {
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

    export function giveRoleToUser(bot: DiscordIOClient, serverId: string, userId: string, roleId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            bot.addToRole({
                roleID: roleId,
                serverID: serverId,
                userID: userId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    export function takeRoleFromUser(bot: DiscordIOClient, serverId: string, userId: string, roleId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            bot.removeFromRole({
                roleID: roleId,
                serverID: serverId,
                userID: userId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }

    export function createRole(bot: DiscordIOClient, serverId: string): Promise<DiscordIORole> {
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

    export function editRole(bot: DiscordIOClient, serverId: string, roleId: string, changes: IEditRoleOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            bot.editRole({
                color: changes.color,
                hoist: undefined,
                mentionable: undefined,
                name: changes.name,
                permissions: undefined,
                position: undefined,
                roleID: roleId,
                serverID: serverId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    export function deleteRole(bot: DiscordIOClient, serverId: string, roleId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            bot.deleteRole({
                roleID: roleId,
                serverID: serverId
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(response); // TODO: What does this return?
            });
        });
    }

    export function pinMessage(bot: DiscordIOClient, channelId: string, messageId: string): Promise<void> {
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

    export function addReaction(bot: DiscordIOClient, channelId: string, messageId: string, reaction: string): Promise<void> {
        const anyBot: any = bot;
        return new Promise((resolve, reject) => {
            anyBot.addReaction({
                channelID: channelId,
                messageID: messageId,
                reaction
            }, (err: IDiscordIOCallbackError, response: any) => {
                if (err) {
                    if (err.statusCode === 429) {
                        const waitTime : number = err.response.retry_after;
                        if (waitTime) {
                            console.log('rate limited, waiting ' + waitTime);
                            Delay.wait(waitTime)
                                .then(() => addReaction(bot, channelId, messageId, reaction))
                                .then(resolve);
                            return;
                        }
                    }

                    reject(err);
                    return;
                }

                resolve();
            });
        })
    }

    export function removeOwnReaction(bot: DiscordIOClient, channelId: string, messageId: string, reaction: string): Promise<void> {
        const anyBot: any = bot;
        return new Promise((resolve, reject) => {
            anyBot.removeReaction({
                channelID: channelId,
                messageID: messageId,
                reaction,
                userID: bot.id
            }, (err: IDiscordIOCallbackError, response: any) => {
                if (err) {
                    if (err.statusCode === 429) {
                        const waitTime: number = err.response.retry_after;
                        if (waitTime) {
                            console.log('rate limited, waiting ' + waitTime);
                            Delay.wait(waitTime)
                                .then(() => removeOwnReaction(bot, channelId, messageId, reaction))
                                .then(resolve);
                            return;
                        }
                    }

                    reject(err);
                    return;
                }

                resolve();
            });
        })
    }
}
