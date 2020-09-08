import { OfficialDiscordReactionEvent } from 'official-discord';
import Phil from '@phil/phil';
import { deleteMessage } from '@phil/promises/discord';
import ReactablePost from '@phil/reactables/post';
import { ReactableHandler, ReactableType } from '@phil/reactables/types';
import { Data, Emoji } from './shared';
import TextChannel from '@phil/discord/TextChannel';
import Bucket from '@phil/buckets';
import { PromptQueue } from '@phil/prompts/queue';

class PromptQueueReactableHandler
  implements ReactableHandler<ReactableType.PromptQueue> {
  public async processReactionAdded(
    phil: Phil,
    post: ReactablePost<ReactableType.PromptQueue>,
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
    post: ReactablePost<ReactableType.PromptQueue>,
    pageDelta: number
  ): Promise<void> {
    const newPageNumber = post.data.currentPage + pageDelta;

    if (!this.canMoveToPage(post.data, newPageNumber)) {
      throw new Error(`Cannot move to page ${newPageNumber}`);
    }

    if (!(post.message.channel instanceof TextChannel)) {
      throw new Error('Queue is only built to work in public channels.');
    }

    const bucket = await Bucket.getFromId(phil.bot, phil.db, post.data.bucket);
    if (!bucket) {
      throw new Error(
        'The bucket that this queue is for (`' +
          post.data.bucket +
          '`) has been deleted.'
      );
    }

    const queue = await PromptQueue.getPromptQueue(
      phil.bot,
      phil.db,
      bucket,
      newPageNumber,
      post.data.pageSize
    );

    await post.remove(phil.db);
    await deleteMessage(phil.bot, post.message.channel.id, post.message.id);

    await queue.postToChannel(phil.bot, phil.db, post.message.channel.id);
  }

  private canMoveToPage(data: Data, newPageNumber: number): boolean {
    return newPageNumber > 0 && newPageNumber <= data.totalNumberPages;
  }
}

export default PromptQueueReactableHandler;
