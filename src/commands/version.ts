import { IPublicMessage } from 'phil';
import Feature from '../phil/features/feature';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import Versions from '../phil/versions';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

export default class VersionCommand implements ICommand {
    public readonly name = 'version';
    public readonly aliases = ['versions'];
    public readonly feature : Feature = null;

    public readonly helpGroup = HelpGroup.General;
    public readonly helpDescription = 'Prints out the current version numbers related to Phil.';

    public readonly versionAdded = 3;

    public readonly isAdminCommand = false;
    public processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const reply = '**Code:** Version ' + Versions.CODE + '.\n**Database:** Version ' + Versions.DATABASE + '.';
        return DiscordPromises.sendMessage(phil.bot, message.channelId, reply);
    }
};
