import { Reaction } from '@phil/discord/types';

import Phil from '@phil/phil';
import ReactablePost from '@phil/reactables/post';
import { ReactableHandler, ReactableType } from '@phil/reactables/types';
import { Data, Emoji } from './shared';
import TextChannel from '@phil/discord/TextChannel';
import ServerBucketsCollection from '@phil/ServerBucketsCollection';

class PromptQueueReactableHandler
  implements ReactableHandler<ReactableType.PromptQueue> {
  public async processReactionAdded(
    phil: Phil,
    post: ReactablePost<ReactableType.PromptQueue>,
    reaction: Reaction
  ): Promise<void> {
    switch (reaction.name) {
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

    const serverConfig = await phil.serverDirectory.getServerConfig(
      post.message.channel.server
    );
    if (!serverConfig) {
      throw new Error(
        `Could not find server config for a server we're processing the prompt queue for? (message: ${post.message.id}, server: ${post.message.channel.server.id})`
      );
    }

    const bucketCollection = new ServerBucketsCollection(
      phil.discordClient,
      phil.db,
      post.message.channel.server,
      serverConfig
    );

    const bucket = await bucketCollection.retrieve({
      id: post.data.bucket,
      type: 'id',
    });
    if (!bucket) {
      throw new Error(
        'The bucket that this queue is for (`' +
          post.data.bucket +
          '`) has been deleted.'
      );
    }

    const queue = await bucket.getPromptQueue();
    const { reactableFactory, messageTemplate } = await queue.getPage(
      newPageNumber,
      post.data.pageSize
    );

    await post.remove(phil.db);
    await post.message.delete();

    const { finalMessage } = await post.message.channel.sendMessage(
      messageTemplate
    );

    if (reactableFactory) {
      await reactableFactory.create(finalMessage);
    }
  }

  private canMoveToPage(data: Data, newPageNumber: number): boolean {
    return newPageNumber > 0 && newPageNumber <= data.totalNumberPages;
  }
}

export default PromptQueueReactableHandler;
