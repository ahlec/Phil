import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PublicMessage from '@phil/discord/PublicMessage';
import DiscordClient from '@phil/discord/Client';
import { EmbedColor } from '@phil/discord/Channel';
import Database from '@phil/database';
import Leaderboard from '@phil/prompts/leaderboard';
import LeaderboardEntry from '@phil/prompts/leaderboard-entry';
import Command, { LoggerDefinition } from './@types';

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

  if (!process.env.CUSTOM_EMOJI_TRANSPARENT) {
    throw new Error('Bad environment?');
  }

  let message = emoji || process.env.CUSTOM_EMOJI_TRANSPARENT;
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

export default class LeaderboardCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('leaderboard', parentDefinition, {
      feature: Features.Prompts,
      helpDescription:
        'Display the leaderboard for prompt submissions on the server, which shows who is in the lead for suggesting discussion prompts.',
      helpGroup: HelpGroup.Prompts,
      versionAdded: 11,
    });
  }

  public async processMessage(
    discordClient: DiscordClient,
    database: Database,
    message: PublicMessage
  ): Promise<void> {
    const leaderboard = await Leaderboard.getLeaderboard(
      discordClient,
      database,
      message.server
    );
    const reply = createLeaderboardMessage(leaderboard);

    const { channel } = message;
    await channel.sendMessage({
      color: EmbedColor.PowderBlue,
      contents: reply,
      footer:
        'You can increase your score by submitting prompts! Use ' +
        message.serverConfig.commandPrefix +
        'suggest in a direct message with me!',
      title: 'Hijack Prompt of the Day Leaderboard',
    });
  }
}
