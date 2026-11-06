jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn() },
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6 },
  ActivityType: { Fitness: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  startLocationUpdatesAsync: jest.fn(async () => {}),
  hasStartedLocationUpdatesAsync: jest.fn(async () => true),
  stopLocationUpdatesAsync: jest.fn(async () => {}),
}));
jest.mock('../persist', () => ({
  loadJSON: jest.fn(async () => null),
  saveJSON: jest.fn(async () => {}),
}));
jest.mock('../pedometer', () => ({
  available: jest.fn(async () => false),
  ensurePermission: jest.fn(async () => true),
  hasHistory: jest.fn(() => true),
  startWatching: jest.fn(),
  stopWatching: jest.fn(),
  segmentSteps: jest.fn(async () => null),
}));

const BASE_TIME = 1_800_000_000_000;
const METRES_PER_DEGREE = 6_371_000 * Math.PI / 180;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fix(metres: number, seconds: number) {
  return {
    coords: { latitude: 43 + metres / METRES_PER_DEGREE, longitude: 76, accuracy: 5 },
    timestamp: BASE_TIME + seconds * 1000,
  };
}

function harness() {
  const tracker = require('../workoutTracker') as typeof import('../workoutTracker');
  const location = require('expo-location');
  const storage = require('../persist');
  const appState = require('react-native').AppState;
  const task = require('expo-task-manager').defineTask.mock.calls[0][1];
  const foreground = appState.addEventListener.mock.calls[0][1];
  const pedometer = require('../pedometer');
  const deliver = (...locations: ReturnType<typeof fix>[]) => task({ data: { locations } });
  return { tracker, location, storage, deliver, foreground, pedometer };
}

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(Date, 'now').mockReturnValue(BASE_TIME);
});
afterEach(() => jest.restoreAllMocks());

describe('workout result consistency', () => {
  it('saves the same distance and route that were displayed during recording', async () => {
    const { tracker, deliver } = harness();
    await tracker.start('run');
    await deliver(fix(0, 0), fix(1000, 600));
    jest.mocked(Date.now).mockReturnValue(BASE_TIME + 600_000);
    const displayed = tracker.getSession();
    const result = await tracker.finish();
    expect(result.distanceM).toBeCloseTo(1000, 5);
    expect(result.distanceM).toBe(displayed.distanceM);
    expect(result.coords).toEqual(displayed.coords);
    expect(result.durationSec).toBe(600);
  });

  it('includes a final GPS batch displayed while the location service is stopping', async () => {
    const { tracker, location, deliver } = harness();
    await tracker.start('run');
    await deliver(fix(0, 0), fix(1000, 600));
    jest.mocked(Date.now).mockReturnValue(BASE_TIME + 630_000);
    const stopping = deferred<void>();
    const enteredStop = deferred<void>();
    location.stopLocationUpdatesAsync.mockImplementationOnce(() => {
      enteredStop.resolve();
      return stopping.promise;
    });
    const finishing = tracker.finish();
    await enteredStop.promise;
    await deliver(fix(1100, 630));
    const displayed = tracker.getSession();
    stopping.resolve();
    const result = await finishing;
    expect(displayed.distanceM).toBeCloseTo(1100, 5);
    expect(result.distanceM).toBe(displayed.distanceM);
    expect(result.coords).toEqual(displayed.coords);
  });

  it('does not replace a newer GPS route with a slow foreground read', async () => {
    const { tracker, storage, deliver, foreground } = harness();
    await tracker.start('run');
    await deliver(fix(0, 0), fix(1000, 600));
    const onDisk = JSON.parse(JSON.stringify(tracker.getSession()));
    const foregroundRead = deferred<typeof onDisk>();
    const backgroundRead = deferred<typeof onDisk>();
    storage.loadJSON
      .mockImplementationOnce(() => foregroundRead.promise)
      .mockImplementationOnce(() => backgroundRead.promise);
    foreground('active');
    const locationBatch = deliver(fix(1100, 630));
    backgroundRead.resolve(onDisk);
    await locationBatch;
    const latestDistance = tracker.getSession().distanceM;
    foregroundRead.resolve(onDisk);
    await Promise.resolve();
    await Promise.resolve();
    expect(latestDistance).toBeCloseTo(1100, 5);
    expect(tracker.getSession().distanceM).toBe(latestDistance);
    const result = await tracker.finish();
    expect(result.distanceM).toBe(latestDistance);
  });

  it('hydrates once when a background batch and the screen arrive together after a restart', async () => {
    const { tracker, storage, deliver } = harness();
    const onDisk = {
      ...tracker.getSession(), active: true, type: 'run',
      startedAt: BASE_TIME, segmentStartedAt: BASE_TIME,
      coords: [{ latitude: 43, longitude: 76 }],
      lastAt: BASE_TIME, lastAccuracy: 5,
    };
    const reading = deferred<typeof onDisk>();
    storage.loadJSON.mockImplementation(() => reading.promise);
    const screen = tracker.restore();
    const locationBatch = deliver(fix(1000, 600));
    expect(storage.loadJSON).toHaveBeenCalledTimes(1);
    reading.resolve(onDisk);
    await Promise.all([screen, locationBatch]);
    expect(tracker.getSession().distanceM).toBeCloseTo(1000, 5);
    expect(tracker.getSession().coords).toHaveLength(2);
  });

  it('does not count time or movement after Finish while GPS shutdown is pending', async () => {
    const { tracker, location, deliver } = harness();
    await tracker.start('run');
    await deliver(fix(0, 0), fix(1000, 600));
    jest.mocked(Date.now).mockReturnValue(BASE_TIME + 600_000);
    const stopping = deferred<void>();
    const enteredStop = deferred<void>();
    location.stopLocationUpdatesAsync.mockImplementationOnce(() => {
      enteredStop.resolve();
      return stopping.promise;
    });
    const finishing = tracker.finish();
    await enteredStop.promise;
    jest.mocked(Date.now).mockReturnValue(BASE_TIME + 630_000);
    await deliver(fix(1100, 630));
    stopping.resolve();
    const result = await finishing;
    expect(result.distanceM).toBeCloseTo(1000, 5);
    expect(result.durationSec).toBe(600);
    expect(result.coords).toHaveLength(2);
    await deliver(fix(1200, 660));
    expect(tracker.getSession().active).toBe(false);
    expect(tracker.getSession().distanceM).toBe(0);
  });

  it('keeps distance and elapsed time when finishing from pause', async () => {
    const { tracker, deliver } = harness();
    await tracker.start('walk');
    await deliver(fix(0, 0), fix(1000, 600));
    jest.mocked(Date.now).mockReturnValue(BASE_TIME + 600_000);
    await tracker.pause();
    jest.mocked(Date.now).mockReturnValue(BASE_TIME + 900_000);
    await deliver(fix(1100, 650));
    const result = await tracker.finish();
    expect(result.type).toBe('walk');
    expect(result.distanceM).toBeCloseTo(1000, 5);
    expect(result.durationSec).toBe(600);
  });

  it('keeps measured steps if the final pedometer query has no answer', async () => {
    const { tracker, deliver, pedometer } = harness();
    pedometer.available.mockResolvedValue(true);
    pedometer.segmentSteps.mockResolvedValueOnce(900).mockResolvedValueOnce(null);
    await tracker.start('run');
    await deliver(fix(0, 0), fix(1000, 600));
    jest.mocked(Date.now).mockReturnValue(BASE_TIME + 600_000);
    await tracker.refreshSteps();
    expect(tracker.getSession().steps).toBe(900);
    const result = await tracker.finish();
    expect(result.steps).toBe(900);
    expect(result.distanceM).toBeCloseTo(1000, 5);
  });

  it('ignores a delayed step refresh after the session has finished', async () => {
    const { tracker, pedometer } = harness();
    pedometer.available.mockResolvedValue(true);
    const reading = deferred<number>();
    pedometer.segmentSteps.mockImplementationOnce(() => reading.promise).mockResolvedValueOnce(900);
    await tracker.start('run');
    const refreshing = tracker.refreshSteps();
    const result = await tracker.finish();
    expect(result.steps).toBe(900);
    reading.resolve(800);
    await refreshing;
    expect(tracker.getSession().active).toBe(false);
    expect(tracker.getSession().steps).toBeNull();
  });
});
