'use strict';

import { SuggestCommandBase } from './bases/suggest-base';

export class SuggestCommand extends SuggestCommandBase {
    protected readonly suggestAnonymously = false;

    readonly name = 'suggest';
    readonly aliases : string[] = [];

    readonly helpDescription = 'Suggests a new prompt to Phil. (*DIRECT MESSAGE ONLY*)';

    readonly versionAdded = 1;
}
