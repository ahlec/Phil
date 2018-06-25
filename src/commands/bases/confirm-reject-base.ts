import Database from 'database';
import Features from 'features/all-features';
import { HelpGroup } from 'help-groups';
import PublicMessage from 'messages/public';
import Phil from 'phil';
import ServerConfig from 'server-config';
import { BotUtils } from 'utils';
import ICommand from '../@types';

interface IConfirmRejectResults {
    numSuccessful : number;
    numFailed : number;
}

enum PerformResult {
    Skipped,
    Error,
    Success
}

export default abstract class ConfirmRejectCommandBase implements ICommand {
    public abstract readonly name: string;
    public abstract readonly aliases: ReadonlyArray<string>;
    public readonly feature = Features.Prompts;

    public readonly helpGroup = HelpGroup.None;
    public readonly helpDescription: string = null;

    public abstract readonly versionAdded: number;

    public readonly isAdminCommand = true;

    protected abstract readonly noPromptsConfirmedMessage: string;
    protected abstract readonly onePromptConfirmedMessage: string;
    protected abstract readonly multiplePromptsConfirmedMessage: string;

    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const numbers = this.getNumbersFromCommandArgs(commandArgs);
        console.log(require('util').inspect(numbers));

        const results: IConfirmRejectResults = {
            numFailed: 0,
            numSuccessful: 0
        };

        for (let confirmNumber of numbers) {
            confirmNumber = confirmNumber - 1; // Public facing, it's 1-based, but in the database it's 0-based
            const result = await this.performAction(phil, message.serverConfig, message.channelId, confirmNumber);
            console.log('result of number %d: %d', confirmNumber, result);
            if (result === PerformResult.Success) {
                results.numSuccessful++;
            } else if (result === PerformResult.Error) {
                results.numFailed++;
            }
        }

        this.sendCompletionMessage(phil, message.serverConfig, message.channelId, results);
    }

    protected abstract performActionOnPrompt(phil: Phil, serverConfig: ServerConfig, promptId: number): Promise<boolean>;

    private getNumbersFromCommandArgs(commandArgs: ReadonlyArray<string>): number[] {
        if (commandArgs.length !== 1) {
            throw new Error('You must provide a single parameter. This can be either an individual number, or a range of numbers.');
        }

        if (BotUtils.isNumeric(commandArgs[0])) {
            const singleNumber = parseInt(commandArgs[0], 10);
            return [singleNumber];
        }

        const numberSpan = this.parseNumberSpan(commandArgs[0]);
        if (numberSpan.length === 0) {
            throw new Error('You must specify at least one number as an argument in order to use this command.');
        }

        return numberSpan;
    }

    private parseNumberSpan(arg: string): number[] {
        const separatedPieces = arg.split('-');
        if (separatedPieces.length !== 2) {
            throw new Error('You must use the format of `1-9` or `3-5` to indicate a range of numbers.');
        }

        if (!BotUtils.isNumeric(separatedPieces[0]) || !BotUtils.isNumeric(separatedPieces[1])) {
            throw new Error('One or both of the arguments you provided in the range were not actually numbers.');
        }

        const lowerBound = parseInt(separatedPieces[0], 10);
        const upperBound = parseInt(separatedPieces[1], 10);
        if (upperBound < lowerBound) {
            throw new Error('The range you indicated was a negative range (the second number came before the first number)!');
        }

        const includedNumbers: number[] = [];
        for (let num = lowerBound; num <= upperBound; ++num) {
            includedNumbers.push(num);
        }

        return includedNumbers;
    }

    private async performAction(phil: Phil, serverConfig: ServerConfig, channelId: string, confirmNumber: number): Promise<PerformResult> {
        try {
            const results = await phil.db.query('SELECT prompt_id FROM prompt_confirmation_queue WHERE channel_id = $1 and confirm_number = $2', [channelId, confirmNumber]);
            if (results.rowCount === 0) {
                return PerformResult.Skipped;
            }

            const promptId = results.rows[0].prompt_id;
            const actionResult = this.performActionOnPrompt(phil, serverConfig, promptId);
            if (!actionResult) {
                return PerformResult.Error;
            }

            await this.removeNumberFromConfirmationQueue(phil.db, channelId, confirmNumber);
            return PerformResult.Success;
        } catch {
            return PerformResult.Error;
        }
    }

    private async removeNumberFromConfirmationQueue(db: Database, channelId: string, confirmNumber: number) {
        const results = await db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1 AND confirm_number = $2', [channelId, confirmNumber]);
        if (results.rowCount === 0) {
            throw new Error('Could not remove a prompt from the unconfirmed confirmation queue.');
        }
    }

    private sendCompletionMessage(phil: Phil, serverConfig: ServerConfig, channelId: string, results: IConfirmRejectResults) {
        if (results.numSuccessful === 0) {
            BotUtils.sendErrorMessage({
                bot: phil.bot,
                channelId,
                message: this.noPromptsConfirmedMessage.replace(/\{commandPrefix\}/g, serverConfig.commandPrefix)
            });
            return;
        }

        BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId,
            message: (results.numSuccessful === 1 ? this.onePromptConfirmedMessage : this.multiplePromptsConfirmedMessage).replace(/\{commandPrefix\}/g, serverConfig.commandPrefix)
        });
    }
}
