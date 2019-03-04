export const ONE_SECOND: number = 1000;
export const ONE_MINUTE: number = ONE_SECOND * 60;
export const ONE_HOUR: number = ONE_MINUTE * 60;
export const ONE_DAY: number = ONE_HOUR * 24;
export const ONE_WEEK: number = ONE_DAY * 7;
export const ONE_MONTH: number = ONE_DAY * 31;

interface DurationUnit {
  unit: number;
  singular: string;
  plural: string;
}

const UNITS: ReadonlyArray<DurationUnit> = [
  {
    plural: 'months',
    singular: 'month',
    unit: ONE_MONTH,
  },
  {
    plural: 'weeks',
    singular: 'week',
    unit: ONE_WEEK,
  },
  {
    plural: 'days',
    singular: 'day',
    unit: ONE_DAY,
  },
  {
    plural: 'hours',
    singular: 'hour',
    unit: ONE_HOUR,
  },
  {
    plural: 'minutes',
    singular: 'minute',
    unit: ONE_MINUTE,
  },
  {
    plural: 'seconds',
    singular: 'second',
    unit: ONE_SECOND,
  },
];

export function durationToStr(
  duration: number,
  separator: string | undefined = ', '
): string {
  if (duration < 0) {
    throw new Error('Invalid duration (negative number)');
  }

  const pieces: string[] = [];
  let remaining = duration;
  for (const { plural, singular, unit } of UNITS) {
    const num = Math.floor(remaining / unit);
    if (num === 0) {
      continue;
    }

    if (num === 1) {
      pieces.push(`${num} ${singular}`);
    } else {
      pieces.push(`${num} ${plural}`);
    }

    remaining -= num * unit;
  }

  return pieces.join(separator);
}
