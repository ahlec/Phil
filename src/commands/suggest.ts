'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { Database } from '../phil/database';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage, IServerConfig } from 'phil';
import { Features } from '../phil/features';
import { DiscordPromises } from '../promises/discord';
import { Bucket } from '../phil/buckets';
import { SuggestSessionReactableShared } from '../phil/reactables/suggest-session/shared';
import SuggestSessionReactableFactory from '../phil/reactables/suggest-session/factory';
import SubmissionSession from '../phil/prompts/submission-session';

interface Suggestion {
    readonly bucket: Bucket;
    readonly prompt: string;
}

export default class SuggestCommand implements Command {
    readonly name = 'suggest';
    readonly aliases: string[] = [];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Suggests a new prompt to Phil.';

    readonly versionAdded = 1;

    readonly isAdminCommand = false;
    async processMessage(phil: Phil, message: IPublicMessage, commandArgs: string[]): Promise<any> {
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

    private async sendDirectMessage(phil: Phil, userId: string, serverConfig: IServerConfig, session: SubmissionSession) {
        const messageId = await DiscordPromises.sendEmbedMessage(phil.bot, userId, {
            color: 0xB0E0E6,
            title: ':pencil: Begin Sending Suggestions :incoming_envelope:',
            description: SuggestCommand.getBeginMessage(phil, serverConfig, session)
        });

        const reactableFactory = new SuggestSessionReactableFactory(phil.bot, phil.db, {
            messageId: messageId,
            channelId: userId,
            user: phil.bot.users[userId],
            timeLimit: session.remainingTime.asMinutes(),
            canMakeAnonymous: true
        });
        await reactableFactory.create();
    }

    private static getBeginMessage(phil: Phil, serverConfig: IServerConfig, session: SubmissionSession): string {
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
}
