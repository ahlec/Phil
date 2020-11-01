import MessageTemplate from '@phil/discord/MessageTemplate';

import Bucket from '@phil/buckets';
import Database from '@phil/database';
import PromptQueueReactableFactory from '@phil/reactables/prompt-queue/factory';

import Prompt from './prompt';

export interface PromptQueueEntry {
  readonly position: number;
  readonly prompt: Prompt;
}

class PromptQueuePage {
  private readonly totalNumPages: number;

  public constructor(
    private readonly database: Database,
    public readonly bucket: Bucket,
    public readonly entries: readonly PromptQueueEntry[],
    private readonly pageNumber: number,
    private readonly pageSize: number,
    private readonly totalQueueLength: number
  ) {
    this.totalNumPages = Math.ceil(totalQueueLength / pageSize);
  }

  public get messageTemplate(): MessageTemplate {
    return {
      color: 'powder-blue',
      description: this.messageBody,
      fields: null,
      footer:
        this.totalNumPages > 1
          ? `Viewing page ${this.pageNumber} / ${this.totalNumPages}. Navigate using the arrows below.`
          : null,
      title: 'Prompt Queue for ' + this.bucket.displayName,
      type: 'embed',
    };
  }

  public get reactableFactory(): PromptQueueReactableFactory | null {
    if (this.totalNumPages <= 1) {
      return null;
    }

    return new PromptQueueReactableFactory(
      this.database,
      {
        timeLimit: 10,
      },
      {
        bucket: this.bucket.id,
        currentPage: this.pageNumber,
        pageSize: this.pageSize,
        totalNumberPages: this.totalNumPages,
      }
    );
  }

  private get messageBody(): string {
    if (this.entries.length === 0) {
      return 'There are no prompts in the queue right now.';
    }

    const lines: string[] = [];
    const promptNoun = this.totalQueueLength === 1 ? 'prompt' : 'prompts';
    lines.push(
      `:calendar_spiral: The queue currently contains **${this.totalQueueLength} ${promptNoun}**.`
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
}

export default PromptQueuePage;
