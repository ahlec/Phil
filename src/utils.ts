import Role from '@phil/discord/Role';

export function getRandomArrayEntry<T>(arr: ReadonlyArray<T>): T {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

export function isValidHexColor(input: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(input);
}

export function isHexColorRole(role: Role): boolean {
  const isHex = isValidHexColor(role.name);
  return isHex;
}

export function isNumeric(input: string): boolean {
  const numInput = parseInt(input, 10);
  if (isNaN(numInput) || !isFinite(numInput)) {
    return false;
  }

  return numInput.toString(10) === input;
}

export function isSameDay(dateA: Date, dateB: Date): boolean {
  if (dateA.getUTCFullYear() !== dateB.getUTCFullYear()) {
    return false;
  }

  if (dateA.getUTCMonth() !== dateB.getUTCMonth()) {
    return false;
  }

  return dateA.getUTCDate() === dateB.getUTCDate();
}

export function stitchTogetherArray(values: ReadonlyArray<string>): string {
  let str = '';
  for (let index = 0; index < values.length; ++index) {
    if (index > 0) {
      if (index < values.length - 1) {
        str += ', ';
      } else {
        str += ' or ';
      }
    }

    str += '`' + values[index] + '`';
  }

  return str;
}

export function truncateString(message: string, maxCharacters: number): string {
  if (!message) {
    return '';
  }

  if (maxCharacters <= 0) {
    return '';
  }

  if (maxCharacters >= message.length) {
    return message;
  }

  const finalSpace = message.lastIndexOf(' ', maxCharacters);
  const finalTab = message.lastIndexOf('\t', maxCharacters);
  const finalNewline = message.lastIndexOf('\n', maxCharacters);

  let finalIndex = Math.max(finalSpace, finalTab, finalNewline);
  if (finalIndex < 0) {
    finalIndex = maxCharacters;
  }

  return message.substr(0, finalIndex);
}

export function isNotNull<T>(val: T | null): val is T {
  return val !== null;
}

export function sanitizeMarkdown(text: string): string {
  return text.replace(/(\*|_|`|~|\\)/g, '');
}
