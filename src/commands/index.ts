'use strict';

import { Command, ICommandLookup } from './@types';
import { AnonSuggestCommand } from './anonsuggest';
import { ApologiseCommand } from './apologise';
import { HelpCommand } from './help';

export const CommandLookup : ICommandLookup = {};

function registerCommand(command : Command) {
    CommandLookup[command.name] = command;
    for (let alias of command.aliases) {
        CommandLookup[alias] = command;
    }
}

let helpCommand = new HelpCommand();

registerCommand(new AnonSuggestCommand());
registerCommand(new ApologiseCommand());
registerCommand(helpCommand);

helpCommand.saveCommandDefinitions(CommandLookup);
