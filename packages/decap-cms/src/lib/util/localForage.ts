export interface LocalForage {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

const PREFIX = 'decap-cms:';

function setItem<T>(key: string, value: T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      resolve(value);
    } catch (err) {
      reject(err);
    }
  });
}

function getItem<T>(key: string): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) {
        resolve(null);
        return;
      }
      resolve(JSON.parse(raw) as T);
    } catch (err) {
      reject(err);
    }
  });
}

function removeItem(key: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      localStorage.removeItem(PREFIX + key);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function keys(): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    try {
      const result: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) result.push(k.slice(PREFIX.length));
      }
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

function clear(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

const localForage: LocalForage = { setItem, getItem, removeItem, clear, keys };

localForage
  .setItem('localForageTest', { expires: Date.now() + 300000 })
  .then(() => localForage.removeItem('localForageTest'))
  .catch((err: { code?: number }) => {
    if (err.code === 22) {
      console.warn('Unable to set localStorage key. Quota exceeded! Full disk?');
    }
    console.log(err);
  });

export default localForage;
