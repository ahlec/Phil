import Phil from './phil';
import SubmissionSession from './prompts/submission-session';
import TimezoneQuestionnaire from './timezones/questionnaire';

export async function endOngoingDirectMessageProcesses(
  phil: Phil,
  userId: string
) {
  const submissionSession = await SubmissionSession.getActiveSession(
    phil,
    userId
  );
  if (submissionSession) {
    await submissionSession.end(phil);
  }

  const questionnaireStage = await TimezoneQuestionnaire.getStageForUser(
    phil.db,
    userId
  );
  if (TimezoneQuestionnaire.isCurrentlyDoingQuestionnaire(questionnaireStage)) {
    await TimezoneQuestionnaire.endQuestionnaire(phil.db, userId);
  }
}
