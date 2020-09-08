import * as moment from 'moment';
import Database from '@phil/database';
import ServerConfig from '@phil/server-config';
import Submission from './submission';
import MessageTemplate from '@phil/discord/MessageTemplate';

export interface PromptDatabaseSchema {
  prompt_id: string;
  submission_id: string;
  prompt_number: string;
  prompt_date: string | null;
  repetition_number: string;
}

class Prompt {
  public constructor(
    private readonly database: Database,
    private readonly serverConfig: ServerConfig,
    public readonly submission: Submission,
    public readonly id: number,
    public readonly promptNumber: number,
    public readonly repetitionNumber: number,
    private promptDateInternal: moment.Moment | null
  ) {}

  public get promptDate(): moment.Moment | null {
    return this.promptDateInternal;
  }

  public get messageTemplate(): MessageTemplate {
    const {
      bucket: { promptTitleFormat },
      submissionText,
    } = this.submission;

    return {
      color: 'powder-blue',
      description: submissionText,
      fields: null,
      footer: this.promptMessageFooter,
      title: promptTitleFormat.replace(/\{0\}/g, this.promptNumber.toString()),
      type: 'embed',
    };
  }

  private get promptMessageFooter(): string {
    const firstSentencePieces: string[] = ['This'];

    const { submittedAnonymously, suggestingMember } = this.submission;
    let includedName: boolean;
    if (submittedAnonymously) {
      includedName = true;
      firstSentencePieces.push('was suggested anonymously');
    } else if (suggestingMember) {
      includedName = true;
      firstSentencePieces.push(
        'was suggested by',
        suggestingMember.displayName
      );
    } else {
      includedName = false;
    }

    const includedRepetitionCount = this.repetitionNumber > 0;
    if (includedRepetitionCount) {
      const times = this.repetitionNumber === 1 ? 'time' : 'times';

      if (includedName) {
        firstSentencePieces.push('and');
      }

      firstSentencePieces.push(
        'has been shown',
        this.repetitionNumber.toString(),
        times,
        'before'
      );
    }

    let firstSentence: string;
    if (includedName || includedRepetitionCount) {
      firstSentence = `${firstSentencePieces.join(' ')}.`;
    } else {
      firstSentence = '';
    }

    const secondSentence = `You can suggest your own by using ${this.serverConfig.commandPrefix}suggest.`;

    if (firstSentence) {
      return `${firstSentence} ${secondSentence}`;
    }

    return secondSentence;
  }

  public async publish(): Promise<void> {
    if (this.promptDate) {
      throw new Error('This prompt has already been published.');
    }

    this.promptDateInternal = moment.utc();
    try {
      const rowsUpdated = await this.database.execute(
        `UPDATE
          prompt_v2
        SET
          prompt_date = $1
        WHERE
          prompt_id = $2`,
        [this.promptDateInternal, this.id]
      );

      if (rowsUpdated <= 0) {
        throw new Error('Could not publish the prompt in the database.');
      }
    } catch (e) {
      this.promptDateInternal = null;
      throw e;
    }
  }
}

export default Prompt;
