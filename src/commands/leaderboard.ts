import EmbedColor from '../embed-color';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import Leaderboard from '../prompts/leaderboard';
import LeaderboardEntry from '../prompts/leaderboard-entry';
import ICommand from './@types';

const RANKING_EMOJI: { [rank: number]: string } = {
  1: ':first_place:',
  2: ':second_place:',
  3: ':third_place:',
};

const RANKING_TEXT: { [rank: number]: string } = {
  1: '1ˢᵗ',
  2: '2ⁿᵈ',
  3: '3ʳᵈ',
  4: '4ᵗʰ',
  5: '5ᵗʰ',
  6: '6ᵗʰ',
  7: '7ᵗʰ',
  8: '8ᵗʰ',
  9: '9ᵗʰ',
  10: '10ᵗʰ',
};

function createLeaderboardMessageEntry(
  ranking: number,
  entry: LeaderboardEntry
): string {
  const emoji = RANKING_EMOJI[ranking];
  const rankText = RANKING_TEXT[ranking];

  let message = emoji || process.env.CUSTOM_EMOJI_TRANSPARENT!;
  message += ' ';
  message += rankText;
  message += ': **';
  message += entry.displayName;
  message += '**';

  if (!entry.isStillInServer) {
    message += ' (no longer in server)';
  }

  message += ' has submitted **';
  message += entry.score;
  message += '** prompt';
  if (entry.score !== 1) {
    message += 's';
  }
  message += '\n';

  return message;
}

function createLeaderboardMessage(leaderboard: Leaderboard): string {
  let leaderboardMessage = '';

  for (let index = 0; index < leaderboard.entries.length; ++index) {
    if (index > 0) {
      leaderboardMessage += '\n';
    }

    leaderboardMessage += createLeaderboardMessageEntry(
      index + 1,
      leaderboard.entries[index]
    );
  }

  return leaderboardMessage;
}

export default class LeaderboardCommand implements ICommand {
  public readonly name = 'leaderboard';
  public readonly aliases: ReadonlyArray<string> = [];
  public readonly feature = Features.Prompts;
  public readonly permissionLevel = PermissionLevel.General;

  public readonly helpGroup = HelpGroup.Prompts;
  public readonly helpDescription =
    'Display the leaderboard for prompt submissions on the server, which shows who is in the lead for suggesting discussion prompts.';

  public readonly versionAdded = 11;

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const leaderboard = await Leaderboard.getLeaderboard(
      phil.bot,
      phil.db,
      message.server
    );
    const reply = createLeaderboardMessage(leaderboard);

    DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Info,
      description: reply,
      footer: {
        text:
          'You can increase your score by submitting prompts! Use ' +
          message.serverConfig.commandPrefix +
          'suggest in a direct message with me!',
      },
      title: 'Hijack Prompt of the Day Leaderboard',
    });
  }
}
