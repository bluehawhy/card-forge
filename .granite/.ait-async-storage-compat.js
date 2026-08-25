const __appsInTossAsyncStorageWarning = `
[apps-in-toss] @react-native-async-storage/async-storage is not available in AppsInToss.
Use Storage from the AppsInToss SDK instead.

import { Storage } from '@apps-in-toss/framework';

const KEY = 'my-key';

async function handleSetStorageItem(value) {
  await Storage.setItem(KEY, value);
}

async function handleGetStorageItem() {
  return Storage.getItem(KEY);
}

async function handleRemoveStorageItem() {
  await Storage.removeItem(KEY);
}
`.trim();

let __appsInTossDidWarn = false;

function warnOnce(methodName) {
  if (__appsInTossDidWarn) {
    return;
  }

  __appsInTossDidWarn = true;

  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn([__appsInTossAsyncStorageWarning, 'Called method: ' + methodName].join('\n'));
  }
}

function invokeCallback(callback, value) {
  if (typeof callback === "function") {
    callback(null, value);
  }
}

export function getItem(_key, callback) {
  warnOnce('getItem');
  invokeCallback(callback, null);
  return Promise.resolve(null);
}

export function setItem(_key, _value, callback) {
  warnOnce('setItem');
  invokeCallback(callback);
  return Promise.resolve();
}

export function removeItem(_key, callback) {
  warnOnce('removeItem');
  invokeCallback(callback);
  return Promise.resolve();
}

export function mergeItem(_key, _value, callback) {
  warnOnce('mergeItem');
  invokeCallback(callback);
  return Promise.resolve();
}

export function clear(callback) {
  warnOnce('clear');
  invokeCallback(callback);
  return Promise.resolve();
}

export function getAllKeys(callback) {
  warnOnce('getAllKeys');
  const keys = [];
  invokeCallback(callback, keys);
  return Promise.resolve(keys);
}

export function multiGet(keys, callback) {
  warnOnce('multiGet');
  const values = keys.map((key) => [key, null]);
  invokeCallback(callback, values);
  return Promise.resolve(values);
}

export function multiSet(_keyValuePairs, callback) {
  warnOnce('multiSet');
  invokeCallback(callback);
  return Promise.resolve();
}

export function multiRemove(_keys, callback) {
  warnOnce('multiRemove');
  invokeCallback(callback);
  return Promise.resolve();
}

export function multiMerge(_keyValuePairs, callback) {
  warnOnce('multiMerge');
  invokeCallback(callback);
  return Promise.resolve();
}

export function flushGetRequests() {
  warnOnce('flushGetRequests');
}

export function useAsyncStorage(key) {
  return {
    getItem(callback) {
      return getItem(key, callback);
    },
    setItem(value, callback) {
      return setItem(key, value, callback);
    },
    mergeItem(value, callback) {
      return mergeItem(key, value, callback);
    },
    removeItem(callback) {
      return removeItem(key, callback);
    },
  };
}

const AsyncStorage = {
  getItem,
  setItem,
  removeItem,
  mergeItem,
  clear,
  getAllKeys,
  multiGet,
  multiSet,
  multiRemove,
  multiMerge,
  flushGetRequests,
  useAsyncStorage,
};

export default AsyncStorage;
