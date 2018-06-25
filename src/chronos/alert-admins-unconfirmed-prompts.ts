import Phil from 'phil';
import { DiscordPromises } from 'promises/discord';
import UnconfirmedPromptTally from 'prompts/unconfirmed-prompt-tally';
import ServerConfig from 'server-config';
import BotUtils from 'utils';
import IChrono from './@types';

export default class AlertAdminsUnconfirmedPromptsChrono implements IChrono {
    public readonly handle = 'alert-admins-unconfirmed-prompts';

    public async process(phil: Phil, serverConfig: ServerConfig, now: Date) {
        const unconfirmedTally = await UnconfirmedPromptTally.collectForServer(phil.db, serverConfig.server.id);
        const reply = this.getUnconfimedPromptsMessage(serverConfig, unconfirmedTally).trim();
        if (reply.length === 0) {
            return;
        }

        DiscordPromises.sendEmbedMessage(phil.bot, serverConfig.botControlChannel.id, {
            color: 0xB0E0E6,
            description: reply,
            title: ':ballot_box: Unconfirmed Prompt Submissions'
        });
    }

    private getUnconfimedPromptsMessage(serverConfig: ServerConfig, unconfirmedTallies: UnconfirmedPromptTally[]): string {
        if (!unconfirmedTallies || unconfirmedTallies.length === 0) {
            return '';
        }

        let message = '';
        for (const tally of unconfirmedTallies) {
            message += this.getMessageForTally(tally) + '\n';
        }

        message += '\n';

        const randomTally = BotUtils.getRandomArrayEntry(unconfirmedTallies);
        message += 'You can say `' + serverConfig.commandPrefix + 'unconfirmed ' + randomTally.bucketHandle + '` to start the confirmation process.';
        return message;
    }

    private getMessageForTally(tally: UnconfirmedPromptTally): string {
        if (tally.numUnconfirmed === 1) {
            return 'There is **1** unconfirmed prompt waiting in bucket `' + tally.bucketHandle + '`.';
        }

        return 'There are **' + tally.numUnconfirmed + '** prompts waiting in bucket `' + tally.bucketHandle + '`.';
    }
}
