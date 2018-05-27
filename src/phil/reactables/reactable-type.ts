import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import { Database } from '../database';
import { ReactablePost } from './post';
import { OfficialDiscordReactionEvent, OfficialDiscordEmoji } from 'official-discord';

export abstract class ReactableType  {
    abstract readonly handle : string;

    abstract processReactionAdded(bot : DiscordIOClient, db : Database, post : ReactablePost, event : OfficialDiscordReactionEvent) : Promise<any>;

    protected resetEmoji(bot : DiscordIOClient, post : ReactablePost, emoji : OfficialDiscordEmoji) : Promise<void> {
        const anyBot : any = bot;
        return new Promise((resolve, reject) => {
            anyBot.removeReaction({
                channelID: post.channelId,
                messageID: post.messageId,
                userID: post.user.id,
                reaction: (emoji.id ? emoji : emoji.name)
            }, (err : Error, response : any) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }
};
