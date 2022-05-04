/** @deprecated */
function fakeTime(sandbox) {
  let clock = sandbox.useFakeTimers();
  return new TimeLord(clock);
}

class TimeLord {
  constructor(clock) {
    this.clock = clock;
  }

  speedup(interval, times) {
    let tick = (n) => {
      if (n === 0) return; // eslint-disable-line curly
      process.nextTick(() => {
        this.clock.tick(interval);
        n--;
        tick(n);
      });
    };
    tick(times);
  }
}
export {fakeTime};
