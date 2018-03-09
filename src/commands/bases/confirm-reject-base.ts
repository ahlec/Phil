'use strict';

import { Command } from '../@types';
import { HelpGroup } from '../../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../../phil/discord-message';
import { Database } from '../../phil/database';
import { Features } from '../../phil/features';
import { DiscordPromises } from '../../promises/discord';
import { BotUtils } from '../../phil/utils';

interface ConfirmRejectResults {
    numSuccessful : number;
    numFailed : number;
}

enum PerformResult {
    Skipped,
    Error,
    Success
}

export abstract class ConfirmRejectCommandBase implements Command {
    protected abstract readonly noPromptsConfirmedMessage : string;
    protected abstract readonly onePromptConfirmedMessage : string;
    protected abstract readonly multiplePromptsConfirmedMessage : string;

    abstract readonly name : string;
    abstract readonly aliases : string[];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.None;
    readonly helpDescription : string = null;

    abstract readonly versionAdded : number;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const numbers = this.getNumbersFromCommandArgs(commandArgs);
        console.log(require('util').inspect(numbers));

        const results = {
            numSuccessful: 0,
            numFailed: 0
        };

        for (let number of numbers) {
            number = number - 1; // Public facing, it's 1-based, but in the database it's 0-based
            let result = await this.performAction(bot, db, message.channelId, number);
            console.log('result of number %d: %d', number, result);
            if (result === PerformResult.Success) {
                results.numSuccessful++;
            } else if (result === PerformResult.Error) {
                results.numFailed++;
            }
        }

        this.sendCompletionMessage(bot, message.channelId, results);
    }

    protected abstract performActionOnPrompt(bot : DiscordIOClient, db : Database, promptId : number) : Promise<boolean>;

    private getNumbersFromCommandArgs(commandArgs : string[]) : number[] {
        if (commandArgs.length !== 1) {
            throw new Error('You must provide a single parameter. This can be either an individual number, or a range of numbers.');
        }

        if (BotUtils.isNumeric(commandArgs[0])) {
            const singleNumber = parseInt(commandArgs[0]);
            return [singleNumber];
        }

        const numberSpan = this.parseNumberSpan(commandArgs[0]);
        if (numberSpan.length === 0) {
            throw new Error('You must specify at least one number as an argument in order to use this command.');
        }

        return numberSpan;
    }

    private parseNumberSpan(arg : string) : number[] {
        const separatedPieces = arg.split('-');
        if (separatedPieces.length !== 2) {
            throw new Error('You must use the format of `1-9` or `3-5` to indicate a range of numbers.');
        }

        if (!BotUtils.isNumeric(separatedPieces[0]) || !BotUtils.isNumeric(separatedPieces[1])) {
            throw new Error('One or both of the arguments you provided in the range were not actually numbers.');
        }

        const lowerBound = parseInt(separatedPieces[0]);
        const upperBound = parseInt(separatedPieces[1]);
        if (upperBound < lowerBound) {
            throw new Error('The range you indicated was a negative range (the second number came before the first number)!');
        }

        var includedNumbers = [];
        for (let num = lowerBound; num <= upperBound; ++num) {
            includedNumbers.push(num);
        }

        return includedNumbers;
    }

    private async performAction(bot : DiscordIOClient, db : Database, channelId : string, number : number) : Promise<PerformResult> {
        try {
            const results = await db.query('SELECT prompt_id FROM prompt_confirmation_queue WHERE channel_id = $1 and confirm_number = $2', [channelId, number]);
            if (results.rowCount === 0) {
                return PerformResult.Skipped;
            }

            const promptId = results.rows[0].prompt_id;
            const actionResult = this.performActionOnPrompt(bot, db, promptId);
            if (!actionResult) {
                return PerformResult.Error;
            }

            await this.removeNumberFromConfirmationQueue(db, channelId, number);
            return PerformResult.Success;
        } catch {
            return PerformResult.Error;
        }
    }

    private async removeNumberFromConfirmationQueue(db : Database, channelId : string, number : number) : Promise<void> {
        const results = await db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1 AND confirm_number = $2', [channelId, number]);
        if (results.rowCount === 0) {
            throw new Error('Could not remove a prompt from the unconfirmed confirmation queue.');
        }
    }

    private sendCompletionMessage(bot : DiscordIOClient, channelId : string, results : ConfirmRejectResults) {
        if (results.numSuccessful === 0) {
            BotUtils.sendErrorMessage({
                bot: bot,
                channelId: channelId,
                message: this.noPromptsConfirmedMessage
            });
            return;
        }

        BotUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: (results.numSuccessful === 1 ? this.onePromptConfirmedMessage : this.multiplePromptsConfirmedMessage)
        });
    }
}
