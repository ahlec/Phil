'use strict';

export class InputMessage {
    private readonly _commandName : string;
    private readonly _commandArgs : string[];

    constructor(commandName : string, commandArgs : string[]) {
        this._commandName = commandName;
        this._commandArgs = commandArgs;
    }

    static parseFromMessage(message : string) : InputMessage {
        if (message === undefined || message === '') {
            return null;
        }

        const words = message.split(' ').filter(word => word.trim().length > 0);
        if (words.length === 0) {
            return null;
        }

        const prompt = words[0].toLowerCase();
        if (!prompt.startsWith(process.env.COMMAND_PREFIX)) {
            return null;
        }

        const commandName = prompt.substr(process.env.COMMAND_PREFIX.length);
        return new InputMessage(commandName, words.slice(1));
    }

    getCommandName() : string {
        return this._commandName;
    }

    getCommandArgs() : string[] {
        return this._commandArgs;
    }
};
