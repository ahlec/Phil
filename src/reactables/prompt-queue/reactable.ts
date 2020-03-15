import { OfficialDiscordReactionEvent } from 'official-discord';
import Bucket from '../../buckets';
import Phil from '../../phil';
import { deleteMessage } from '../../promises/discord';
import { PromptQueue } from '../../prompts/queue';
import ReactablePost from '../../reactables/post';
import ReactableType from '../../reactables/reactable-type';
import { Data, Emoji, ReactableHandle } from './shared';

export default class PromptQueueReactable extends ReactableType {
  public readonly handle = ReactableHandle;

  public async processReactionAdded(
    phil: Phil,
    post: ReactablePost,
    event: OfficialDiscordReactionEvent
  ): Promise<void> {
    switch (event.emoji.name) {
      case Emoji.Previous: {
        await this.movePage(phil, post, -1);
        break;
      }

      case Emoji.Next: {
        await this.movePage(phil, post, 1);
        break;
      }
    }
  }

  private async movePage(
    phil: Phil,
    post: ReactablePost,
    pageDelta: number
  ): Promise<void> {
    const data = post.jsonData as Data;
    const newPageNumber = data.currentPage + pageDelta;

    if (!this.canMoveToPage(data, newPageNumber)) {
      console.log('cannot move to page ' + newPageNumber);
      return;
    }

    const bucket = await Bucket.getFromId(phil.bot, phil.db, data.bucket);
    if (!bucket) {
      throw new Error(
        'The bucket that this queue is for (`' +
          data.bucket +
          '`) has been deleted.'
      );
    }

    const queue = await PromptQueue.getPromptQueue(
      phil.bot,
      phil.db,
      bucket,
      newPageNumber,
      data.pageSize
    );

    await post.remove(phil.db);
    await deleteMessage(phil.bot, post.channelId, post.messageId);

    await queue.postToChannel(phil.bot, phil.db, post);

    console.log('moving to page ' + newPageNumber);
  }

  private canMoveToPage(data: Data, newPageNumber: number): boolean {
    return newPageNumber > 0 && newPageNumber <= data.totalNumberPages;
  }
}
