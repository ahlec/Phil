import Command, { CommandLookup, LoggerDefinition } from './@types';
import ApologiseCommand from './apologise';
import BirthdayCommand from './birthday';
import BlacklistCommand from './blacklist';
import BucketCommand from './bucket';
import CalendarCommand from './calendar';
import ColourCommand from './colour';
import ConchCommand from './conch';
import ConfigCommand from './config';
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
import TimediffCommand from './timediff';
import TimezoneCommand from './timezone';
import UnconfirmedCommand from './unconfirmed';
import UnpauseCommand from './unpause';
import UtcCommand from './utc';
import WelcomeCommand from './welcome';
import YoutubeCommand from './youtube';

// REGULAR_COMMANDS are all commands *other than* p!help
const REGULAR_COMMANDS: ReadonlyArray<new (
  parentDefinition: LoggerDefinition
) => Command> = [
  ApologiseCommand,
  BirthdayCommand,
  BlacklistCommand,
  BucketCommand,
  CalendarCommand,
  ColourCommand,
  ConchCommand,
  ConfigCommand,
  ConfirmCommand,
  DefineCommand,
  DisableCommand,
  EnableCommand,
  KuzcoCommand,
  LeaderboardCommand,
  MapCommand,
  NewsCommand,
  PauseCommand,
  PromptCommand,
  PronounCommand,
  QueueCommand,
  RejectCommand,
  RemoveCommand,
  RequestCommand,
  SuggestCommand,
  TimediffCommand,
  TimezoneCommand,
  UnconfirmedCommand,
  UnpauseCommand,
  UtcCommand,
  WelcomeCommand,
  YoutubeCommand,
];

function addToLookup(command: Command, lookup: CommandLookup): void {
  lookup[command.name] = command;
  for (const alias of command.aliases) {
    lookup[alias] = command;
  }
}

export function instantiateCommands(
  parentDefinition: LoggerDefinition
): CommandLookup {
  const lookup: CommandLookup = {};
  for (const constructor of REGULAR_COMMANDS) {
    const command = new constructor(parentDefinition);
    addToLookup(command, lookup);
  }

  const help = new HelpCommand(parentDefinition, lookup);
  addToLookup(help, lookup);

  return lookup;
}
