'use strict';

import { Chrono, IChronoLookup } from './@types';
import { AlertLowBucketQueueChrono } from './alert-low-bucket-queue';
import { BootyDayChrono } from './booty-day';
import { PostNewPromptsChrono } from './post-new-prompts';
import { RemoveUnusedColorRolesChrono } from './remove-unused-colour-roles';

export const ChronoLookup : IChronoLookup = {};

function registerChrono(chrono : Chrono) {
    ChronoLookup[chrono.handle] = chrono;
    console.log('chrono \'%s\' registered', chrono.handle);
}

registerChrono(new AlertLowBucketQueueChrono());
registerChrono(new BootyDayChrono());
registerChrono(new PostNewPromptsChrono());
registerChrono(new RemoveUnusedColorRolesChrono());
