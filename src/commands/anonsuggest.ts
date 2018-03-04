'use strict';

import { SuggestCommandBase } from './bases/suggest-base';

export class AnonSuggestCommand extends SuggestCommandBase {
    protected readonly suggestAnonymously = true;

    readonly name = 'anonsuggest';
    readonly aliases : string[] = [];

    readonly helpDescription = 'Suggests a new prompt to Phil anonymously. Your name will not be displayed, but you will still receive leaderboard points should it be approved. (*DIRECT MESSAGE ONLY*)';

    readonly versionAdded = 11;
}
