import { ConfirmationStage } from './@all-stages';
import Stage from './@stage';

import Phil from '../../phil';
import { sendMessage } from '../../promises/discord';

export async function sendStageMessage(
  phil: Phil,
  userId: string,
  stage: Stage
): Promise<void> {
  const message = await stage.getMessage(phil.db, userId);
  await sendMessage(phil.bot, userId, message);
}

export async function setStage(
  phil: Phil,
  userId: string,
  stage: Stage
): Promise<void> {
  const results = await phil.db.query(
    'UPDATE timezones SET stage = $1 WHERE userid = $2',
    [stage.stageNumber, userId]
  );
  if (results.rowCount === 0) {
    throw new Error(
      'There were no database records updated when making the database update query call.'
    );
  }

  await sendStageMessage(phil, userId, stage);
}

export async function setTimezone(
  phil: Phil,
  userId: string,
  timezoneName: string
): Promise<void> {
  const results = await phil.db.query(
    'UPDATE timezones SET timezone_name = $1 WHERE userid = $2',
    [timezoneName, userId]
  );
  if (results.rowCount === 0) {
    throw new Error('Could not update the timezone field in the database.');
  }

  setStage(phil, userId, ConfirmationStage);
}
