import { IServerConfig } from 'phil';

export class InputMessage {
    private readonly _commandName : string;
    private readonly _commandArgs : string[];

    constructor(commandName : string, commandArgs : string[]) {
        this._commandName = commandName;
        this._commandArgs = commandArgs;
    }

    static parseFromMessage(serverConfig : IServerConfig, message : string) : InputMessage {
        if (message === undefined || message === '') {
            return null;
        }

        const words = message.split(' ').filter(word => word.trim().length > 0);
        if (words.length === 0) {
            return null;
        }

        const prompt = words[0].toLowerCase();
        if (!prompt.startsWith(serverConfig.commandPrefix)) {
            return null;
        }

        const commandName = prompt.substr(serverConfig.commandPrefix.length);
        return new InputMessage(commandName, words.slice(1));
    }

    getCommandName() : string {
        return this._commandName;
    }

    getCommandArgs() : string[] {
        return this._commandArgs;
    }
};
