import Feature from '../features/feature';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import Versions from '../versions';
import ICommand from './@types';

export default class VersionCommand implements ICommand {
    public readonly name = 'version';
    public readonly aliases = ['versions'];
    public readonly feature: Feature = null;
    public readonly permissionLevel = PermissionLevel.BotManagerOnly;

    public readonly helpGroup = HelpGroup.General;
    public readonly helpDescription = 'Prints out the current version numbers related to Phil.';

    public readonly versionAdded = 3;

    public processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const reply = '**Code:** Version ' + Versions.CODE + '.\n**Database:** Version ' + Versions.DATABASE + '.';
        return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
