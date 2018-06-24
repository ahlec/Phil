import ICommand, { ICommandLookup } from './@types';
import ApologiseCommand from './apologise';
import BirthdayCommand from './birthday';
import BucketCommand from './bucket';
import CalendarCommand from './calendar';
import ColourCommand from './colour';
import ConchCommand from './conch';
import ConfirmCommand from './confirm';
import DefineCommand from './define';
import DisableCommand from './disable';
import EnableCommand from './enable';
import HelpCommand from './help/command';
import KuzcoCommand from './kuzco';
import LeaderboardCommand from './leaderboard';
import MapCommand from './map';
import NewsCommand from './news';
import PauseCommand from './pause';
import PromptCommand from './prompt';
import PronounCommand from './pronoun';
import QueueCommand from './queue';
import RejectCommand from './reject';
import RemoveCommand from './remove';
import RequestCommand from './request';
import SuggestCommand from './suggest';
import { TimediffCommand } from './timediff';
import { TimezoneCommand } from './timezone';
import { UnconfirmedCommand } from './unconfirmed';
import { UnpauseCommand } from './unpause';
import { UtcCommand } from './utc';
import { VersionCommand } from './version';
import { YoutubeCommand } from './youtube';

export const CommandLookup: ICommandLookup = {};
export default CommandLookup;

function registerCommand(command: ICommand) {
    CommandLookup[command.name] = command;
    for (const alias of command.aliases) {
        CommandLookup[alias] = command;
    }
}

const helpCommand = new HelpCommand();

registerCommand(new ApologiseCommand());
registerCommand(new BirthdayCommand());
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
registerCommand(new PronounCommand());
registerCommand(new QueueCommand());
registerCommand(new RejectCommand());
registerCommand(new RemoveCommand());
registerCommand(new RequestCommand());
registerCommand(new SuggestCommand());
registerCommand(new TimediffCommand());
registerCommand(new TimezoneCommand());
registerCommand(new UnconfirmedCommand());
registerCommand(new UnpauseCommand());
registerCommand(new UtcCommand());
registerCommand(new VersionCommand());
registerCommand(new YoutubeCommand());

helpCommand.saveCommandDefinitions(CommandLookup);
