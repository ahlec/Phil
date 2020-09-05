export function wait(milliseconds: number): Promise<void> {
  if (milliseconds < 0) {
    return Promise.reject('Cannot wait negative number of milliseconds');
  }

  if (milliseconds === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
