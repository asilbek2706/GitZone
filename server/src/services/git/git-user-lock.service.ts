type LockMode = 'read' | 'write';

type LockRequest = {
  mode: LockMode;
  resolve: (release: () => void) => void;
};

type LockState = {
  readers: number;
  writer: boolean;
  queue: LockRequest[];
};

const locks = new Map<string, LockState>();

const getLockState = (userId: string): LockState => {
  const existing = locks.get(userId);

  if (existing) {
    return existing;
  }

  const state: LockState = {
    readers: 0,
    writer: false,
    queue: [],
  };

  locks.set(userId, state);

  return state;
};

const acquireLock = (
  userId: string,
  mode: LockMode,
): Promise<() => void> => {
  const state = getLockState(userId);

  return new Promise((resolve) => {
    const request: LockRequest = { mode, resolve };

    state.queue.push(request);

    const dispatch = (): void => {
      if (state.writer) {
        return;
      }

      const next = state.queue[0];

      if (!next) {
        if (state.readers === 0) {
          locks.delete(userId);
        }

        return;
      }

      if (next.mode === 'write') {
        if (state.readers > 0) {
          return;
        }
        state.queue.shift();
        state.writer = true;

        let released = false;

        next.resolve(() => {
          if (released) return;

          released = true;
          state.writer = false;
          dispatch();
        });

        return;
      }

      while (state.queue[0]?.mode === 'read') {
        const reader = state.queue.shift();

        if (!reader) break;

        state.readers += 1;

        let released = false;

        reader.resolve(() => {
          if (released) return;

          released = true;
          state.readers -= 1;

          if (state.readers === 0) {
            dispatch();
          }
        });
      }
    };

    dispatch();
  });
};

export const withGitUserReadLock = async <T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const release = await acquireLock(userId, 'read');

  try {
    return await operation();
  } finally {
    release();
  }
};

export const withGitUserWriteLock = async <T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const release = await acquireLock(userId, 'write');

  try {
    return await operation();
  } finally {
    release();
  }
};