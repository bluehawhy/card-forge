
(function () {
  global.nativeModuleProxy = new Proxy(global.nativeModuleProxy, {
    get: function (target, name) {
      if (name === 'GraniteModule') {
        return target['BedrockModule'] || target[name];
      }

      if (name === 'GraniteCoreModule') {
        return target['BedrockCoreModule'] || target[name];
      }

      return target[name];
    }
  });

  global.__nativeModuleProxyConfigured = true;
})(
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
    ? global
    : typeof window !== 'undefined'
    ? window
    : this
);
