'use strict';

module.exports = class InputMessage {
    constructor(commandName, commandArgs) {
        this._commandName = commandName;
        this._commandArgs = commandArgs;
    }

    static parseFromMessage(message) {
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

    getCommandName() {
        return this._commandName;
    }

    getCommandArgs() {
        return this._commandArgs;
    }
};
