import * as moment from 'moment';

export function getCurrentPostgresDate(): string {
  const now = moment.utc();
  return now.format('YYYY-M-DD');
}
