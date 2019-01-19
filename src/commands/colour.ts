import { Role as DiscordIORole } from 'discord.io';
import Features from '../features/all-features';
import { DiscordPromises } from '../promises/discord';
import ServerConfig from '../server-config';
import { BotUtils } from '../utils';
import MemberUniqueRoleCommandBase from './bases/member-unique-role-base';

const decemberLinks = [
  'http://www.december.com/html/spec/color0.html',
  'http://www.december.com/html/spec/color1.html',
  'http://www.december.com/html/spec/color2.html',
  'http://www.december.com/html/spec/color3.html',
  'http://www.december.com/html/spec/color4.html',
];

const compliments = [
  "That's a really pretty colour, too.",
  'It looks excellent on you.',
  "That's a phenomenal choice.",
  "That's sure to stand out and turn some heads.",
  'I really love that shade, by the way.',
  "It's absolutely beautiful.",
];

// TData = valid string hex code (ie #000000)
export default class ColourCommand extends MemberUniqueRoleCommandBase<string> {
  public readonly name = 'colour';
  public readonly aliases = ['color'];
  public readonly feature = Features.Colour;

  public readonly helpDescription =
    'Asks Phil to change your username colour to a hex code of your choosing.';

  public readonly versionAdded = 3;

  protected getMissingCommandArgsErrorMessage(
    serverConfig: ServerConfig
  ): string {
    const decemberLink = BotUtils.getRandomArrayEntry(decemberLinks);
    return (
      "You must provide a hex code to this function of the colour that you'd like to use. For example, `" +
      serverConfig.commandPrefix +
      'color #FFFFFF`. You could try checking out ' +
      decemberLink +
      ' for some codes.'
    );
  }

  protected getInvalidInputErrorMessage(
    input: string,
    serverConfig: ServerConfig
  ): string {
    const decemberLink = BotUtils.getRandomArrayEntry(decemberLinks);
    return (
      '`' +
      input +
      "` isn't a valid hex code. I'm looking for it in the format of `#RRGGBB`. You can try checking out " +
      decemberLink +
      ' for some amazing colours.'
    );
  }

  protected tryParseInput(input: string): string {
    if (!BotUtils.isValidHexColor(input)) {
      return null;
    }

    return input.toUpperCase();
  }

  protected isRolePartOfUniquePool(role: DiscordIORole): boolean {
    return BotUtils.isHexColorRole(role);
  }

  protected doesRoleMatchData(role: DiscordIORole, data: string): boolean {
    return role.name === data;
  }

  protected getRoleConfig(data: string): DiscordPromises.IEditRoleOptions {
    const hexColorNumber = parseInt(data.replace('#', '0x'), 16);
    return {
      color: hexColorNumber,
      name: data,
    };
  }

  protected getSuccessMessage(
    serverConfig: ServerConfig,
    data: string
  ): string {
    const compliment = BotUtils.getRandomArrayEntry(compliments);
    return 'Your colour has been changed to **' + data + '**. ' + compliment;
  }
}
