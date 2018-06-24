import Stages from './@all-stages';
import IStage from './@stage';

import { DiscordPromises } from '../../../promises/discord';
import Database from '../../database';
import Phil from '../../phil';

export namespace QuestionnaireStageUtils {
    export async function sendStageMessage(phil: Phil, userId: string, stage: IStage) {
        const message = await stage.getMessage(phil.db, userId);
        return DiscordPromises.sendMessage(phil.bot, userId, message);
    }

    export async function setStage(phil: Phil, userId: string, stage: IStage) {
        const results = await phil.db.query('UPDATE timezones SET stage = $1 WHERE userid = $2', [stage.stageNumber, userId]);
        if (results.rowCount === 0) {
            throw new Error('There were no database records updated when making the database update query call.');
        }

        sendStageMessage(phil, userId, stage);
    }

    export async function setTimezone(phil: Phil, userId: string, timezoneName: string) {
        const results = await phil.db.query('UPDATE timezones SET timezone_name = $1 WHERE userid = $2', [timezoneName, userId]);
        if (results.rowCount === 0) {
            throw new Error('Could not update the timezone field in the database.');
        }

        setStage(phil, userId, Stages.Confirmation);
    }
}

export default QuestionnaireStageUtils;
