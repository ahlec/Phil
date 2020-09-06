import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import ServerConfig from '@phil/server-config';
import { isNumeric } from '@phil/utils';
import Command, { LoggerDefinition } from '@phil/commands/@types';
import Phil from '@phil/phil';

interface ConfirmRejectResults {
  numSuccessful: number;
  numFailed: number;
}

enum PerformResult {
  Skipped,
  Error,
  Success,
}

interface ConfirmRejectCommandBaseDetails {
  aliases?: ReadonlyArray<string>;
  noItemsConfirmedMessage: string;
  oneItemConfirmedMessage: string;
  multipleItemsConfirmedMessage: string;
  versionAdded: number;
}

abstract class ConfirmRejectCommandBase extends Command {
  private readonly noItemsConfirmedMessage: string;
  private readonly oneItemConfirmedMessage: string;
  private readonly multipleItemsConfirmedMessage: string;

  protected constructor(
    name: string,
    parentDefinition: LoggerDefinition,
    details: ConfirmRejectCommandBaseDetails
  ) {
    super(name, parentDefinition, {
      aliases: details.aliases,
      feature: Features.Prompts,
      helpGroup: HelpGroup.None,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: details.versionAdded,
    });

    this.noItemsConfirmedMessage = details.noItemsConfirmedMessage;
    this.oneItemConfirmedMessage = details.oneItemConfirmedMessage;
    this.multipleItemsConfirmedMessage = details.multipleItemsConfirmedMessage;
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const numbers = this.getNumbersFromCommandArgs(invocation.commandArgs);
    const results: ConfirmRejectResults = {
      numFailed: 0,
      numSuccessful: 0,
    };

    for (let confirmNumber of numbers) {
      confirmNumber = confirmNumber - 1; // Public facing, it's 1-based, but in the database it's 0-based
      const result = await this.performAction(
        legacyPhil,
        database,
        invocation.context.serverConfig,
        invocation.context.channelId,
        confirmNumber
      );
      this.write(`result of number ${confirmNumber}: ${result}`);
      if (result === PerformResult.Success) {
        results.numSuccessful++;
      } else if (result === PerformResult.Error) {
        results.numFailed++;
      }
    }

    await this.sendCompletionMessage(invocation, results);
  }

  protected abstract performActionOnSubmission(
    database: Database,
    serverConfig: ServerConfig,
    submissionId: number,
    legacyPhil: Phil
  ): Promise<boolean>;

  private getNumbersFromCommandArgs(
    commandArgs: ReadonlyArray<string>
  ): number[] {
    if (commandArgs.length !== 1) {
      throw new Error(
        'You must provide a single parameter. This can be either an individual number, or a range of numbers.'
      );
    }

    if (isNumeric(commandArgs[0])) {
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

    if (!isNumeric(separatedPieces[0]) || !isNumeric(separatedPieces[1])) {
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
    legacyPhil: Phil,
    database: Database,
    serverConfig: ServerConfig,
    channelId: string,
    confirmNumber: number
  ): Promise<PerformResult> {
    try {
      const results = await database.query<{ submission_id: string }>(
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
        database,
        serverConfig,
        parseInt(submissionId, 10),
        legacyPhil
      );
      if (!actionResult) {
        return PerformResult.Error;
      }

      await this.removeNumberFromConfirmationQueue(
        database,
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
  ): Promise<void> {
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

  private async sendCompletionMessage(
    invocation: CommandInvocation,
    results: ConfirmRejectResults
  ): Promise<void> {
    if (results.numSuccessful === 0) {
      await invocation.respond({
        error: this.noItemsConfirmedMessage.replace(
          /\{commandPrefix\}/g,
          invocation.context.serverConfig.commandPrefix
        ),
        type: 'error',
      });
      return;
    }

    await invocation.respond({
      text: (results.numSuccessful === 1
        ? this.oneItemConfirmedMessage
        : this.multipleItemsConfirmedMessage
      ).replace(
        /\{commandPrefix\}/g,
        invocation.context.serverConfig.commandPrefix
      ),
      type: 'success',
    });
  }
}

export default ConfirmRejectCommandBase;
