import OutboundMessage from '@phil/discord/OutboundMessage';
import TextChannel from '@phil/discord/TextChannel';
import UsersDirectMessagesChannel from '@phil/discord/UsersDirectMessagesChannel';

import Database from '@phil/database';
import { ReactableType, ReactableTypeData } from './types';
import { isNotNull } from '@phil/utils';

interface DbRow {
  message_id: string;
  channel_id: string;
  user_id: string;
  created: number;
  timelimit: string;
  reactable_type: string;
  monitored_reactions: string;
  jsondata: string;
}

class ReactablePost<TType extends ReactableType> {
  public static async getFromMessage(
    db: Database,
    message: OutboundMessage
  ): Promise<ReactablePost<ReactableType> | null> {
    const results = await db.query<DbRow>(
      'SELECT * FROM reactable_posts WHERE message_id = $1 LIMIT 1',
      [message.id]
    );

    if (results.rowCount === 0) {
      return null;
    }

    const [row] = results.rows;
    switch (row.reactable_type) {
      case ReactableType.PromptQueue:
      case ReactableType.SuggestSession: {
        return new ReactablePost(message, row.reactable_type, row);
      }
      default: {
        throw new Error(
          `Unrecognized reactable type of '${row.reactable_type}' on message ID '${row.message_id}'`
        );
      }
    }
  }

  public static async getAllOfTypeInChannel<TType extends ReactableType>(
    db: Database,
    channel: TextChannel | UsersDirectMessagesChannel,
    type: TType
  ): Promise<ReactablePost<TType>[]> {
    const results = await db.query<DbRow>(
      `SELECT * FROM reactable_posts
            WHERE channel_id = $1 AND reactable_type = $2`,
      [channel.id, type]
    );
    return results.rows
      .map((row): ReactablePost<TType> | null => {
        const message = channel.getOutboundMessageById(row.message_id);
        if (!message) {
          return null;
        }

        return new ReactablePost(message, type, row);
      })
      .filter(isNotNull);
  }

  public readonly created: Date;
  public readonly timeLimit: number;
  public readonly monitoredReactions: Set<string>;
  public readonly data: ReactableTypeData[TType];

  private constructor(
    public readonly message: OutboundMessage,
    public readonly type: TType,
    dbRow: DbRow
  ) {
    this.created = new Date(dbRow.created);
    this.timeLimit = parseInt(dbRow.timelimit, 10);
    this.monitoredReactions = new Set(dbRow.monitored_reactions.split(','));
    this.data = JSON.parse(dbRow.jsondata);
  }

  public async remove(db: Database): Promise<void> {
    await db.query('DELETE FROM reactable_posts WHERE message_id = $1', [
      this.message.id,
    ]);

    await Promise.all(
      Array.from(this.monitoredReactions).map(
        (reaction: string): Promise<void> =>
          this.message.removeReaction(reaction)
      )
    );
  }
}

export default ReactablePost;
