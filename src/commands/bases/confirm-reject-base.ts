import Database from '../../database';
import Features from '../../features/all-features';
import { HelpGroup } from '../../help-groups';
import PublicMessage from '../../messages/public';
import PermissionLevel from '../../permission-level';
import Phil from '../../phil';
import ServerConfig from '../../server-config';
import { BotUtils } from '../../utils';
import ICommand from '../@types';

interface ConfirmRejectResults {
  numSuccessful: number;
  numFailed: number;
}

enum PerformResult {
  Skipped,
  Error,
  Success,
}

export default abstract class ConfirmRejectCommandBase implements ICommand {
  public abstract readonly name: string;
  public abstract readonly aliases: ReadonlyArray<string>;
  public readonly feature = Features.Prompts;
  public readonly permissionLevel = PermissionLevel.AdminOnly;

  public readonly helpGroup = HelpGroup.None;
  public readonly helpDescription: string = null;

  public abstract readonly versionAdded: number;

  protected abstract readonly noItemsConfirmedMessage: string;
  protected abstract readonly oneItemConfirmedMessage: string;
  protected abstract readonly multipleItemsConfirmedMessage: string;

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const numbers = this.getNumbersFromCommandArgs(commandArgs);
    const results: ConfirmRejectResults = {
      numFailed: 0,
      numSuccessful: 0,
    };

    for (let confirmNumber of numbers) {
      confirmNumber = confirmNumber - 1; // Public facing, it's 1-based, but in the database it's 0-based
      const result = await this.performAction(
        phil,
        message.serverConfig,
        message.channelId,
        confirmNumber
      );
      console.log('result of number %d: %d', confirmNumber, result);
      if (result === PerformResult.Success) {
        results.numSuccessful++;
      } else if (result === PerformResult.Error) {
        results.numFailed++;
      }
    }

    this.sendCompletionMessage(
      phil,
      message.serverConfig,
      message.channelId,
      results
    );
  }

  protected abstract performActionOnSubmission(
    phil: Phil,
    serverConfig: ServerConfig,
    submissionId: number
  ): Promise<boolean>;

  private getNumbersFromCommandArgs(
    commandArgs: ReadonlyArray<string>
  ): number[] {
    if (commandArgs.length !== 1) {
      throw new Error(
        'You must provide a single parameter. This can be either an individual number, or a range of numbers.'
      );
    }

    if (BotUtils.isNumeric(commandArgs[0])) {
      const singleNumber = parseInt(commandArgs[0], 10);
      return [singleNumber];
    }

    const numberSpan = this.parseNumberSpan(commandArgs[0]);
    if (numberSpan.length === 0) {
      throw new Error(
        'You must specify at least one number as an argument in order to use this command.'
      );
    }

    return numberSpan;
  }

  private parseNumberSpan(arg: string): number[] {
    const separatedPieces = arg.split('-');
    if (separatedPieces.length !== 2) {
      throw new Error(
        'You must use the format of `1-9` or `3-5` to indicate a range of numbers.'
      );
    }

    if (
      !BotUtils.isNumeric(separatedPieces[0]) ||
      !BotUtils.isNumeric(separatedPieces[1])
    ) {
      throw new Error(
        'One or both of the arguments you provided in the range were not actually numbers.'
      );
    }

    const lowerBound = parseInt(separatedPieces[0], 10);
    const upperBound = parseInt(separatedPieces[1], 10);
    if (upperBound < lowerBound) {
      throw new Error(
        'The range you indicated was a negative range (the second number came before the first number)!'
      );
    }

    const includedNumbers: number[] = [];
    for (let num = lowerBound; num <= upperBound; ++num) {
      includedNumbers.push(num);
    }

    return includedNumbers;
  }

  private async performAction(
    phil: Phil,
    serverConfig: ServerConfig,
    channelId: string,
    confirmNumber: number
  ): Promise<PerformResult> {
    try {
      const results = await phil.db.query(
        `SELECT
          submission_id
        FROM
          submission_confirmation_queue
        WHERE
          channel_id = $1 AND
          confirm_number = $2`,
        [channelId, confirmNumber]
      );
      if (results.rowCount === 0) {
        return PerformResult.Skipped;
      }

      const submissionId = results.rows[0].submission_id;
      const actionResult = this.performActionOnSubmission(
        phil,
        serverConfig,
        submissionId
      );
      if (!actionResult) {
        return PerformResult.Error;
      }

      await this.removeNumberFromConfirmationQueue(
        phil.db,
        channelId,
        confirmNumber
      );
      return PerformResult.Success;
    } catch {
      return PerformResult.Error;
    }
  }

  private async removeNumberFromConfirmationQueue(
    db: Database,
    channelId: string,
    confirmNumber: number
  ) {
    const rowsDeleted = await db.execute(
      `DELETE FROM
        submission_confirmation_queue
      WHERE
        channel_id = $1 AND
        confirm_number = $2`,
      [channelId, confirmNumber]
    );
    if (!rowsDeleted) {
      throw new Error(
        'Could not remove a submission from the unconfirmed confirmation queue.'
      );
    }
  }

  private sendCompletionMessage(
    phil: Phil,
    serverConfig: ServerConfig,
    channelId: string,
    results: ConfirmRejectResults
  ) {
    if (results.numSuccessful === 0) {
      BotUtils.sendErrorMessage({
        bot: phil.bot,
        channelId,
        message: this.noItemsConfirmedMessage.replace(
          /\{commandPrefix\}/g,
          serverConfig.commandPrefix
        ),
      });
      return;
    }

    BotUtils.sendSuccessMessage({
      bot: phil.bot,
      channelId,
      message: (results.numSuccessful === 1
        ? this.oneItemConfirmedMessage
        : this.multipleItemsConfirmedMessage
      ).replace(/\{commandPrefix\}/g, serverConfig.commandPrefix),
    });
  }
}
