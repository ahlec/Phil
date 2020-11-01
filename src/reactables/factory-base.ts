import OutboundMessage from '@phil/discord/OutboundMessage';

import Database from '@phil/database';
import ReactablePost from './post';
import { ReactableType, ReactableTypeData } from './types';

export interface ReactableCreationArgs {
  timeLimit: number;
}

abstract class ReactableFactoryBase<TType extends ReactableType> {
  protected constructor(
    private readonly type: TType,
    private readonly database: Database,
    private readonly creationArgs: ReactableCreationArgs,
    protected readonly data: ReactableTypeData[TType]
  ) {}

  public async create(message: OutboundMessage): Promise<void> {
    if (!this.isValid()) {
      throw new Error('The provided creation args are not valid.');
    }

    const reactions = this.getEmojiReactions();

    await this.addToDatabase(message, reactions);
    await this.removeAllOthersOfTypeInChannel(message);

    await Promise.all(
      reactions.map((reaction) => message.addReaction(reaction))
    );
  }

  protected isValid(): boolean {
    if (
      Number.isNaN(this.creationArgs.timeLimit) ||
      this.creationArgs.timeLimit <= 0
    ) {
      return false;
    }

    return true;
  }

  protected abstract getEmojiReactions(): readonly string[];

  private async addToDatabase(
    message: OutboundMessage,
    reactions: readonly string[]
  ): Promise<void> {
    const results = await this.database.query(
      `INSERT INTO
            reactable_posts(
                message_id,     channel_id,          created, timelimit,
                reactable_type, monitored_reactions, jsondata)
            VALUES($1, $2, $3, $4, $5, $6, $7)`,
      [
        message.id,
        message.channel.id,
        new Date(),
        this.creationArgs.timeLimit,
        this.type,
        reactions.join(),
        JSON.stringify(this.data),
      ]
    );

    if (results.rowCount === 0) {
      throw new Error('Unable to create the reactable within the database.');
    }
  }

  private async removeAllOthersOfTypeInChannel(
    message: OutboundMessage
  ): Promise<void> {
    const posts = await ReactablePost.getAllOfTypeInChannel(
      this.database,
      message.channel,
      this.type
    );

    await Promise.all(
      posts.map(
        (post): Promise<void> => {
          if (post.message.id === message.id) {
            return Promise.resolve();
          }

          return post.remove(this.database);
        }
      )
    );
  }
}

export default ReactableFactoryBase;
