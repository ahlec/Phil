import IChrono, { IChronoLookup } from './@types';
import AlertAdminsUnconfirmedPromptsChrono from './alert-admins-unconfirmed-prompts';
import AlertLowBucketQueueChrono from './alert-low-bucket-queue';
import BootyDayChrono from './booty-day';
import HappyBirthdayChrono from './happy-birthday';
import PostNewPromptsChrono from './post-new-prompts';
import RemoveUnusedColorRolesChrono from './remove-unused-colour-roles';

export const ChronoLookup: IChronoLookup = {};
export default ChronoLookup;

function registerChrono(chrono: IChrono) {
    ChronoLookup[chrono.handle] = chrono;
    console.log('chrono \'%s\' registered', chrono.handle);
}

registerChrono(new AlertAdminsUnconfirmedPromptsChrono());
registerChrono(new AlertLowBucketQueueChrono());
registerChrono(new BootyDayChrono());
registerChrono(new HappyBirthdayChrono());
registerChrono(new PostNewPromptsChrono());
registerChrono(new RemoveUnusedColorRolesChrono());
