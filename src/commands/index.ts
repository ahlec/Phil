'use strict';

import { Command, ICommandLookup } from './@types';
import { AnonSuggestCommand } from './anonsuggest';
import { ApologiseCommand } from './apologise';
import { BucketCommand } from './bucket';
import { ConchCommand } from './conch';
import { DisableCommand } from './disable';
import { EnableCommand } from './enable';
import { HelpCommand } from './help';
import { LeaderboardCommand } from './leaderboard';
import { MapCommand } from './map';
import { RemoveCommand } from './remove';
import { RequestCommand } from './request';
import { VersionCommand } from './version';

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
registerCommand(new BucketCommand());
registerCommand(new ConchCommand());
registerCommand(new DisableCommand());
registerCommand(new EnableCommand());
registerCommand(helpCommand);
registerCommand(new LeaderboardCommand());
registerCommand(new MapCommand());
registerCommand(new RemoveCommand());
registerCommand(new RequestCommand());
registerCommand(new VersionCommand());

helpCommand.saveCommandDefinitions(CommandLookup);
