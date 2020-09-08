import { Client as DiscordIOClient } from 'discord.io';
import Bucket from '@phil/buckets';
import Database, { DatabaseResult } from '@phil/database';
import EmbedColor from '@phil/embed-color';
import { sendEmbedMessage, EmbedData } from '@phil/promises/discord';
import PromptQueueReactableFactory from '@phil/reactables/prompt-queue/factory';
import Prompt from './prompt';
import { getKnownOutboundMessage } from '@phil/utils/discord-migration';

export interface PromptQueueEntry {
  readonly position: number;
  readonly prompt: Prompt;
}

interface DbCountResultRow {
  count: string;
  approved_by_admin: string;
}

export class PromptQueue {
  public static async getTotalLength(
    db: Database,
    bucket: Bucket
  ): Promise<number> {
    const result = await db.querySingle<{ count: string }>(
      `SELECT
        count(*)
      FROM
        prompt_v2 AS p
      JOIN
        submission AS s
      ON
        p.submission_id = s.submission_id
      WHERE
        s.bucket_id = $1 AND
        s.approved_by_admin = E'1' AND
        p.prompt_date IS NULL`,
      [bucket.id]
    );

    if (!result) {
      return 0;
    }

    return parseInt(result.count, 10);
  }

  public static async getPromptQueue(
    client: DiscordIOClient,
    db: Database,
    bucket: Bucket,
    pageNum: number,
    pageSize: number
  ): Promise<PromptQueue> {
    const promptResults = await db.query<{ prompt_id: string }>(
      `SELECT
        p.prompt_id,
        p.prompt_number
      FROM
        prompt_v2 AS p
      JOIN
        submission AS s
      ON
        p.submission_id = s.submission_id
      WHERE
        p.prompt_date IS NULL AND
        s.approved_by_admin = E'1' AND
        s.bucket_id = $1
      ORDER BY
        p.prompt_number ASC
      LIMIT $2
      OFFSET $3`,
      [bucket.id, pageSize, (pageNum - 1) * pageSize]
    );
    const promptIds = new Set<number>(
      promptResults.rows.map(({ prompt_id: promptId }) =>
        parseInt(promptId, 10)
      )
    );
    const batchPrompts = await Prompt.getFromBatchIds(client, db, promptIds);
    const orderedPrompts: Prompt[] = promptResults.rows
      .map(({ prompt_id: promptId }) => batchPrompts[parseInt(promptId, 10)])
      .filter((prompt): prompt is Prompt => !!prompt);

    const countResults = await db.query<DbCountResultRow>(
      `SELECT
        s.approved_by_admin,
        COUNT(s.approved_by_admin)
      FROM
        prompt_v2 AS p
      JOIN
        submission AS s
      ON
        p.submission_id = s.submission_id
      WHERE
        p.prompt_date IS NULL AND
        s.bucket_id = $1
      GROUP BY
        s.approved_by_admin`,
      [bucket.id]
    );

    return new PromptQueue(
      bucket,
      orderedPrompts,
      countResults,
      pageNum,
      pageSize
    );
  }

  public readonly pageNumber: number;
  public readonly totalPages: number;
  public readonly hasMultiplePages: boolean;
  public readonly entries: ReadonlyArray<PromptQueueEntry> = [];
  public readonly count: number = 0;
  public readonly unconfirmedCount: number = 0;

  private constructor(
    readonly bucket: Bucket,
    prompts: ReadonlyArray<Prompt>,
    countResults: DatabaseResult<DbCountResultRow>,
    pageNum: number,
    readonly pageSize: number
  ) {
    this.pageNumber = pageNum;

    const queueStart = (pageNum - 1) * pageSize + 1;
    this.entries = prompts.map((prompt, index) => ({
      position: queueStart + index,
      prompt,
    }));

    for (const countRow of countResults.rows) {
      const dbCount = parseInt(countRow.count, 10);
      if (parseInt(countRow.approved_by_admin, 10) === 1) {
        this.count = dbCount;
      } else {
        this.unconfirmedCount = dbCount;
      }
    }

    this.totalPages = Math.ceil(this.count / pageSize);
    this.hasMultiplePages = this.totalPages > 1;
  }

  public async postToChannel(
    bot: DiscordIOClient,
    db: Database,
    channelId: string
  ): Promise<string> {
    const messageId = await sendEmbedMessage(
      bot,
      channelId,
      this.asEmbedObject()
    );
    if (this.hasMultiplePages) {
      await this.setupReactable(bot, db, channelId, messageId);
    }

    return messageId;
  }

  private asEmbedObject(): EmbedData {
    return {
      color: EmbedColor.Info,
      description: this.makeBodyFromQueue(),
      footer: this.makeFooterFromQueue(),
      title: 'Prompt Queue for ' + this.bucket.displayName,
    };
  }

  private makeBodyFromQueue(): string {
    if (this.entries.length === 0) {
      return 'There are no prompts in the queue right now.';
    }

    const lines: string[] = [];
    const promptNoun = this.count === 1 ? 'prompt' : 'prompts';
    lines.push(
      `:calendar_spiral: The queue currently contains **${this.count} ${promptNoun}**.`
    );
    lines.push('');

    for (const {
      position,
      prompt: {
        submission: { submissionText },
      },
    } of this.entries) {
      lines.push(`**${position}.** ${submissionText}`);
    }

    return lines.join('\n');
  }

  private makeFooterFromQueue(): EmbedData['footer'] {
    if (!this.hasMultiplePages) {
      return;
    }

    const message =
      'Viewing page ' +
      this.pageNumber +
      ' / ' +
      this.totalPages +
      '. Navigate using the arrows below.';
    return {
      text: message,
    };
  }

  private async setupReactable(
    bot: DiscordIOClient,
    db: Database,
    channelId: string,
    messageId: string
  ): Promise<void> {
    const factory = new PromptQueueReactableFactory(
      bot,
      db,
      {
        timeLimit: 10,
      },
      {
        bucket: this.bucket.id,
        currentPage: this.pageNumber,
        pageSize: this.pageSize,
        totalNumberPages: this.totalPages,
      }
    );

    const message = getKnownOutboundMessage(bot, messageId, channelId);
    await factory.create(message);
  }
}
