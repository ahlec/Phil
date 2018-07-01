import Bucket from '../buckets';
import EmbedColor from '../embed-color';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import SubmissionSession from '../prompts/submission-session';
import SuggestSessionReactableFactory from '../reactables/suggest-session/factory';
import SuggestSessionReactableShared from '../reactables/suggest-session/shared';
import ServerConfig from '../server-config';
import ICommand from './@types';

export default class SuggestCommand implements ICommand {
    private static getBeginMessage(phil: Phil, serverConfig: ServerConfig, session: SubmissionSession): string {
        const server = phil.bot.servers[session.bucket.serverId];
        const NOWRAP = '';
        return `For the next **${session.remainingTime.asMinutes()} minutes**, every ${
            NOWRAP}message you send to me will be submitted as a new prompt to the **${
            session.bucket.displayName}** on the **${server.name}** server.\n\nWhen ${
            NOWRAP}you\'re finished, hit the ${SuggestSessionReactableShared.Emoji.Stop} reaction ${
            NOWRAP}or simply do nothing until your session runs out of time. ${
            NOWRAP}If you want to change which server or bucket you\'re submitting to, ${
            NOWRAP}use the \`${serverConfig.commandPrefix}suggest\`to start over.\n\nIf you want ${
            NOWRAP}these submissions to be anonymous during this session, hit the ${
            SuggestSessionReactableShared.Emoji.MakeAnonymous} reaction below.`
    }

    public readonly name = 'suggest';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.Prompts;
    public readonly permissionLevel = PermissionLevel.General;

    public readonly helpGroup = HelpGroup.Prompts;
    public readonly helpDescription = 'Suggests a new prompt to Phil.';

    public readonly versionAdded = 1;

    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil, commandArgs, message.serverConfig,
            this.name, false);
        if (!bucket.canUserSubmitTo(phil.bot, message.userId)) {
            const role = message.server.roles[bucket.requiredRoleId];
            throw new Error('In order to be able to submit a prompt to this bucket, you must have \
                the **' + role.name + '** role.');
        }

        const session = await SubmissionSession.startNewSession(phil, message.userId, bucket);
        if (!session) {
            throw new Error('Unable to start a new session despite all good input.');
        }

        this.sendDirectMessage(phil, message.userId, message.serverConfig, session);
    }

    private async sendDirectMessage(phil: Phil, userId: string, serverConfig: ServerConfig, session: SubmissionSession) {
        const messageId = await DiscordPromises.sendEmbedMessage(phil.bot, userId, {
            color: EmbedColor.Info,
            description: SuggestCommand.getBeginMessage(phil, serverConfig, session),
            title: ':pencil: Begin Sending Suggestions :incoming_envelope:'
        });

        const reactableFactory = new SuggestSessionReactableFactory(phil.bot, phil.db, {
            canMakeAnonymous: true,
            channelId: userId,
            messageId,
            timeLimit: session.remainingTime.asMinutes(),
            user: phil.bot.users[userId]
        });
        await reactableFactory.create();
    }
}
