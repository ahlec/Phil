import { Phil } from '../../phil';
import { ReactableType } from '../reactable-type';
import { Client as DiscordIOClient } from 'discord.io';
import { Database } from '../../database';
import { ReactablePost } from '../post';
import { OfficialDiscordReactionEvent } from 'official-discord';
import { DiscordPromises } from '../../../promises/discord';
import { SuggestSessionReactableShared } from './shared';
import { SubmissionSession } from '../../prompts/submission-session';

export class SuggestSessionReactable extends ReactableType {
    readonly handle = SuggestSessionReactableShared.ReactableHandle;

    async processReactionAdded(phil : Phil, post : ReactablePost, event : OfficialDiscordReactionEvent) : Promise<any> {
        if (event.emoji.name !== SuggestSessionReactableShared.Emoji.Stop) {
            return;
        }

        await post.remove(phil.db);

        const activeSession = await SubmissionSession.getActiveSession(phil, post.user.id);
        if (!activeSession) {
            return;
        }

        await activeSession.end(phil);
        await DiscordPromises.sendEmbedMessage(phil.bot, post.user.id, {
            color: 0xB0E0E6,
            title: ':ribbon: Suggestions Session Ended :ribbon:',
            description: this.getWrapupMessage(activeSession)
        });
    }

    private getWrapupMessage(activeSession : SubmissionSession) : string {
        const NOWRAP = '';
        var message = '';

        if (activeSession.numSubmitted > 0) {
            const suggestion = (activeSession.numSubmitted == 1 ? 'suggestion' : 'suggestions');
            const it = (activeSession.numSubmitted == 1 ? 'It' : 'They');
            message += `Thank you for submitting your ${suggestion}! During this session, you ${
                NOWRAP} sent in **${activeSession.numSubmitted} ${suggestion}. ${it} will now ${
                NOWRAP} need to be processed by the server admins. Should ${it.toLowerCase()} ${
                NOWRAP} be approved, ${it.toLowerCase()} will go into the prompt queue and wind ${
                NOWRAP} up being posted one day! Thank you!!\n\n`;
        }

        message += `Should you want to suggest something, just start a new session. I'm always ${
            NOWRAP} listening and eager to hear your suggestions!`;

        return message;
    }
}
