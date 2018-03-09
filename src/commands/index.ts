'use strict';

import { Command, ICommandLookup } from './@types';
import { AnonSuggestCommand } from './anonsuggest';
import { ApologiseCommand } from './apologise';
import { BucketCommand } from './bucket';
import { CalendarCommand } from './calendar';
import { ColourCommand } from './colour';
import { ConchCommand } from './conch';
import { ConfirmCommand } from './confirm';
import { DefineCommand } from './define';
import { DisableCommand } from './disable';
import { EnableCommand } from './enable';
import { HelpCommand } from './help';
import { KuzcoCommand } from './kuzco';
import { LeaderboardCommand } from './leaderboard';
import { MapCommand } from './map';
import { NewsCommand } from './news';
import { PauseCommand } from './pause';
import { PromptCommand } from './prompt';
import { QueueCommand } from './queue';
import { RejectCommand } from './reject';
import { RemoveCommand } from './remove';
import { RequestCommand } from './request';
import { SuggestCommand } from './suggest';
import { UnconfirmedCommand } from './unconfirmed';
import { UnpauseCommand } from './unpause';
import { UtcCommand } from './utc';
import { VersionCommand } from './version';
import { YoutubeCommand } from './youtube';

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
registerCommand(new CalendarCommand());
registerCommand(new ColourCommand());
registerCommand(new ConchCommand());
registerCommand(new ConfirmCommand());
registerCommand(new DefineCommand());
registerCommand(new DisableCommand());
registerCommand(new EnableCommand());
registerCommand(helpCommand);
registerCommand(new KuzcoCommand());
registerCommand(new LeaderboardCommand());
registerCommand(new MapCommand());
registerCommand(new NewsCommand());
registerCommand(new PauseCommand());
registerCommand(new PromptCommand());
registerCommand(new QueueCommand());
registerCommand(new RejectCommand());
registerCommand(new RemoveCommand());
registerCommand(new RequestCommand());
registerCommand(new SuggestCommand());
registerCommand(new UnconfirmedCommand());
registerCommand(new UnpauseCommand());
registerCommand(new UtcCommand());
registerCommand(new VersionCommand());
registerCommand(new YoutubeCommand());

helpCommand.saveCommandDefinitions(CommandLookup);
