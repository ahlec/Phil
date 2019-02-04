import LoggerDefnition from '../LoggerDefinition';
import Chrono from './@types';

import AlertAdminsUnconfirmedSubmissionsChrono from './alert-admins-unconfirmed-submissions';
import AlertLowBucketQueueChrono from './alert-low-bucket-queue';
import BootyDayChrono from './booty-day';
import HappyBirthdayChrono from './happy-birthday';
import PostNewPromptsChrono from './post-new-prompts';
import RemoveUnusedColorRolesChrono from './remove-unused-colour-roles';

const Chronos: ReadonlyArray<
  new (parentDefinition: LoggerDefnition) => Chrono
> = [
  AlertAdminsUnconfirmedSubmissionsChrono,
  AlertLowBucketQueueChrono,
  BootyDayChrono,
  HappyBirthdayChrono,
  PostNewPromptsChrono,
  RemoveUnusedColorRolesChrono,
];

export { default as Chrono } from './@types';

export default Chronos;
