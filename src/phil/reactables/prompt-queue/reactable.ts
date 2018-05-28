import { Phil } from '../../phil';
import { ReactableType } from '../reactable-type';
import { ReactablePost } from '../post';
import { OfficialDiscordReactionEvent } from 'official-discord';
import { Bucket } from '../../buckets';
import { PromptQueue } from '../../prompts/queue';
import { DiscordPromises } from '../../../promises/discord';
import { PromptQueueReactableShared } from './shared';

export class PromptQueueReactable extends ReactableType {
    readonly handle = PromptQueueReactableShared.ReactableHandle;

    async processReactionAdded(phil : Phil, post : ReactablePost, event : OfficialDiscordReactionEvent) : Promise<any> {
        switch (event.emoji.name) {
            case PromptQueueReactableShared.Emoji.Previous: {
                await this.movePage(phil, post, -1);
                break;
            }

            case PromptQueueReactableShared.Emoji.Next: {
                await this.movePage(phil, post, 1);
                break;
            }
        }
    }

    private async movePage(phil : Phil, post : ReactablePost, pageDelta : number) : Promise<void> {
        const data = post.jsonData as PromptQueueReactableShared.IData;
        const newPageNumber = data.currentPage + pageDelta;

        if (!this.canMoveToPage(data, newPageNumber)) {
            console.log('cannot move to page ' + newPageNumber);
            return;
        }

        const bucket = await Bucket.getFromId(phil.bot, phil.db, data.bucket);
        if (!bucket) {
            throw new Error('The bucket that this queue is for (`' + data.bucket + '`) has been deleted.');
        }

        const queue = await PromptQueue.getPromptQueue(phil.bot, phil.db, bucket, newPageNumber, data.pageSize);

        await post.remove(phil.db);
        await DiscordPromises.deleteMessage(phil.bot, post.channelId, post.messageId);

        await queue.postToChannel(phil.bot, phil.db, post);

        console.log('moving to page ' + newPageNumber);
    }

    private canMoveToPage(data : PromptQueueReactableShared.IData, newPageNumber : number) : boolean {
        return (newPageNumber > 0 && newPageNumber <= data.totalNumberPages);
    }
}
