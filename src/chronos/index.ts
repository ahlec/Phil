import Chrono, { ChronoLookup } from './@types';
import AlertAdminsUnconfirmedSubmissionsChrono from './alert-admins-unconfirmed-submissions';
import AlertLowBucketQueueChrono from './alert-low-bucket-queue';
import BootyDayChrono from './booty-day';
import HappyBirthdayChrono from './happy-birthday';
import PostNewPromptsChrono from './post-new-prompts';
import RemoveUnusedColorRolesChrono from './remove-unused-colour-roles';

export const Chronos: ChronoLookup = {};
export default Chronos;

function registerChrono(chrono: Chrono) {
  Chronos[chrono.handle] = chrono;
  console.log("chrono '%s' registered", chrono.handle);
}

registerChrono(new AlertAdminsUnconfirmedSubmissionsChrono());
registerChrono(new AlertLowBucketQueueChrono());
registerChrono(new BootyDayChrono());
registerChrono(new HappyBirthdayChrono());
registerChrono(new PostNewPromptsChrono());
registerChrono(new RemoveUnusedColorRolesChrono());
