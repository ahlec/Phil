import { ReactableType } from './@reactable-type';
import { Client as DiscordIOClient } from 'discord.io';
import { Database } from '../../database';
import { ReactablePost } from '../post';
import { OfficialDiscordReactionEvent } from 'official-discord';
import { Bucket } from '../../buckets';
import { PromptQueue } from '../../prompts/queue';
import { DiscordPromises } from '../../../promises/discord';

export class Data {
    currentPage : number;
    totalNumberPages : number;
    pageSize : number;
    bucket : number;
}

export class PromptQueueReactable extends ReactableType {
    public static readonly PREVIOUS_EMOJI = '◀';
    public static readonly NEXT_EMOJI = '▶';

    readonly handle = 'prompt-queue';

    async processReactionAdded(bot : DiscordIOClient, db : Database, post : ReactablePost, event : OfficialDiscordReactionEvent) : Promise<any> {
        switch (event.emoji.name) {
            case PromptQueueReactable.PREVIOUS_EMOJI: {
                await this.movePage(bot, db, post, -1);
                break;
            }
            case PromptQueueReactable.NEXT_EMOJI: {
                await this.movePage(bot, db, post, 1);
                break;
            }
        }
    }

    private async movePage(bot : DiscordIOClient, db : Database, post : ReactablePost, pageDelta : number) : Promise<void> {
        const data = post.jsonData as Data;
        const newPageNumber = data.currentPage + pageDelta;

        if (!this.canMoveToPage(data, newPageNumber)) {
            console.log('cannot move to page ' + newPageNumber);
            return;
        }

        const bucket = await Bucket.getFromId(bot, db, data.bucket);
        if (!bucket) {
            throw new Error('The bucket that this queue is for (`' + data.bucket + '`) has been deleted.');
        }

        const queue = await PromptQueue.getPromptQueue(bot, db, bucket, newPageNumber, data.pageSize);

        await DiscordPromises.deleteMessage(bot, post.channelId, post.messageId);
        await queue.postToChannel(bot, db, post);

        console.log('moving to page ' + newPageNumber);
    }

    private canMoveToPage(data : Data, newPageNumber : number) : boolean {
        return (newPageNumber > 0 && newPageNumber <= data.totalNumberPages);
    }
}
