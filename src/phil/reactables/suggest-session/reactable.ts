import { Client as DiscordIOClient } from 'discord.io';
import { OfficialDiscordReactionEvent } from 'official-discord';
import { DiscordPromises } from '../../../promises/discord';
import Database from '../../database';
import Phil from '../../phil';
import SubmissionSession from '../../prompts/submission-session';
import ReactablePost from '../post';
import ReactableType from '../reactable-type';
import SuggestSessionReactableFactory from './factory';
import SuggestSessionReactableShared from './shared';

export default class SuggestSessionReactable extends ReactableType {
    public readonly handle = SuggestSessionReactableShared.ReactableHandle;

    public async processReactionAdded(phil: Phil, post: ReactablePost, event: OfficialDiscordReactionEvent): Promise<any> {
        const activeSession = await SubmissionSession.getActiveSession(phil, post.user.id);
        if (!activeSession) {
            return;
        }

        switch (event.emoji.name) {
            case SuggestSessionReactableShared.Emoji.Stop: {
                await this.stopSession(phil, post, activeSession);
                break;
            }

            case SuggestSessionReactableShared.Emoji.MakeAnonymous: {
                await this.makeSessionAnonymous(phil, post, activeSession);
                break;
            }
        }
    }

    private async stopSession(phil: Phil, post: ReactablePost, session: SubmissionSession) {
        await post.remove(phil.db);

        await session.end(phil);
        await DiscordPromises.sendEmbedMessage(phil.bot, post.user.id, {
            color: 0xB0E0E6,
            description: this.getWrapupMessage(session),
            title: ':ribbon: Suggestions Session Ended :ribbon:'
        });
    }

    private getWrapupMessage(activeSession : SubmissionSession) : string {
        const NOWRAP = '';
        let message = '';

        const numSubmitted = activeSession.getNumberSubmissions();
        if (numSubmitted > 0) {
            const suggestion = (numSubmitted === 1 ? 'suggestion' : 'suggestions');
            const it = (numSubmitted === 1 ? 'It' : 'They');
            message += `Thank you for submitting your ${suggestion}! During this session, you ${
                NOWRAP} sent in **${numSubmitted} ${suggestion}. ${it} will now ${
                NOWRAP} need to be processed by the server admins. Should ${it.toLowerCase()} ${
                NOWRAP} be approved, ${it.toLowerCase()} will go into the prompt queue and wind ${
                NOWRAP} up being posted one day! Thank you!!\n\n`;
        }

        message += `Should you want to suggest something, just start a new session. I'm always ${
            NOWRAP} listening and eager to hear your suggestions!`;

        return message;
    }

    private async makeSessionAnonymous(phil: Phil, post: ReactablePost, session: SubmissionSession) {
        await post.remove(phil.db);

        await session.makeAnonymous(phil);
        const NOWRAP = '';
        const messageId = await DiscordPromises.sendEmbedMessage(phil.bot, post.user.id, {
            color: 0xB0E0E6,
            description: `All submissions you send during this session will be anonymous. Don't ${
                NOWRAP}worry though! You'll still get credit for them on the server leaderboard!`,
            title: ':spy: Anonymous Session Begun :spy:'
        });

        const reactableFactory = new SuggestSessionReactableFactory(phil.bot, phil.db, {
            canMakeAnonymous: false,
            channelId: post.channelId,
            messageId,
            timeLimit: session.remainingTime.asMinutes(),
            user: post.user
        });
        await reactableFactory.create();
    }
}
