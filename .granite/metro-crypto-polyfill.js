
(function (global) {
  if (!global.__decrypt &&
      global.nativeModuleProxy &&
      global.nativeModuleProxy.TossCoreCryptoModule &&
      global.nativeModuleProxy.TossCoreCryptoModule.decrypt) {
    global.__decrypt = global.nativeModuleProxy.TossCoreCryptoModule.decrypt;
  }
})(
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
    ? global
    : typeof window !== 'undefined'
    ? window
    : this
);
