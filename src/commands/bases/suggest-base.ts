'use strict';

import { Command } from '../@types';
import { Phil } from '../../phil/phil';
import { Database } from '../../phil/database';
import { HelpGroup } from '../../phil/help-groups';
import { DiscordMessage } from '../../phil/discord-message';
import { Features } from '../../phil/features';
import { DiscordPromises } from '../../promises/discord';
import { Bucket } from '../../phil/buckets';
import { ServerConfig } from '../../phil/server-config';
import { SuggestSessionReactableShared } from '../../phil/reactables/suggest-session/shared';
import { SuggestSessionReactableFactory } from '../../phil/reactables/suggest-session/factory';
import { SubmissionSession } from '../../phil/prompts/submission-session';

interface Suggestion {
    readonly bucket : Bucket;
    readonly prompt : string;
}

export abstract class SuggestCommandBase implements Command {
    protected abstract readonly suggestAnonymously : boolean;

    abstract readonly name : string;
    abstract readonly aliases : string[];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    abstract readonly helpDescription : string;

    abstract readonly versionAdded : number;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil, commandArgs, message.serverConfig,
            this.name, false);
        if (!bucket.canUserSubmitTo(phil.bot, message.userId)) {
            const role = message.server.roles[bucket.requiredRoleId];
            throw new Error('In order to be able to submit a prompt to this bucket, you must have \
                the **' + role.name + '** role.');
        }

        const session = await SubmissionSession.startNewSession(phil, message.userId, bucket,
            this.suggestAnonymously);
        if (!session) {
            throw new Error('Unable to start a new session despite all good input.');
        }

        this.sendDirectMessage(phil, message.userId, message.serverConfig, session);
    }

    private async sendDirectMessage(phil : Phil, userId : string, serverConfig : ServerConfig, session : SubmissionSession) {
        const server = phil.bot.servers[session.bucket.serverId];
        const NOWRAP = '';
        const messageId = await DiscordPromises.sendEmbedMessage(phil.bot, userId, {
            color: 0xB0E0E6,
            title: ':pencil: Begin Sending Suggestions :incoming_envelope:',
            description: `For the next **${session.remainingTime.asMinutes()} minutes**, every ${
                NOWRAP}message you send to me will be submitted as a new prompt to the **${
                session.bucket.displayName}** on the **${server.name}** server.\n\nWhen ${
                NOWRAP}you\'re finished, all you need to do is hit the ${
                NOWRAP}${SuggestSessionReactableShared.Emoji.Stop} reaction on anything I ${
                NOWRAP}post after this, or simply do nothing until your session ends naturally. ${
                NOWRAP}If you want to change which server or prompt bucket you\'re submitting to, ${
                NOWRAP}use the \`${serverConfig.commandPrefix}suggest\` or ${
                NOWRAP}\`${serverConfig.commandPrefix}anonsuggest\` command to begin a new ${
                NOWRAP}session (which will end this one and start a new one).`
        });

        const reactableFactory = new SuggestSessionReactableFactory(phil.bot, phil.db, {
            messageId: messageId,
            channelId: userId,
            user: phil.bot.users[userId],
            timeLimit: session.remainingTime.asMinutes(),
        });
        await reactableFactory.create();
    }
}
