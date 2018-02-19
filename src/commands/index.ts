'use strict';

import { Command, CommandLookup } from './@types';
import { AnonSuggestCommand } from './anonsuggest';
import { ApologiseCommand } from './apologise';
import { HelpCommand } from './help';

const lookup : CommandLookup = {};

function registerCommand(command : Command) {
    lookup[name] = command;
    for (let name of command.aliases) {
        lookup[name] = command;
    }
}

let helpCommand = new HelpCommand();

registerCommand( new AnonSuggestCommand() );
registerCommand( new ApologiseCommand() );
registerCommand( helpCommand );

helpCommand.saveCommandDefinitions(lookup);

export = lookup;
