/**
 * Virtual Mock - Satisfies any import for missing files with safe defaults.
 */
const noop = () => {};
const asyncNoop = async () => {};

// Safe proxy that returns itself indefinitely for any property access
// or can be called as a function/constructor.
const createMockProxy = (name: string) => {
  const proxy: any = new Proxy(noop, {
    get(target, prop) {
      if (prop === 'then') return undefined; // Avoid identifying as a Promise unless needed
      if (prop === 'toString' || prop === 'Symbol.toStringTag') return () => `[Mock ${name}]`;
      return proxy;
    },
    apply() {
      return proxy;
    },
    construct() {
      return proxy;
    }
  });
  return proxy;
};

// Common values for expected exports
export const feature = (name: string) => false;
export const isEnvTruthy = (val: any) => false;
export const logEvent = noop;
export const logError = noop;

// Default export is also a proxy
export default createMockProxy('DefaultMock');

// Catch-all for any named exports from any module
// Note: ES modules require static analysis for exports, but 
// since we're using a loader to redirect, the loader can 
// potentially synthesize exports if needed.
// For now, this file will satisfy the most common named imports encountered.

export const isConnectorTextBlock = () => false;
export const TungstenTool = null;
export const TungstenLiveMonitor = null;
export const useFrustrationDetection = () => ({});
export const useAntOrgWarningNotification = () => ({});
export const useProactive = () => ({});
export const SSHSessionManager = createMockProxy('SSHSessionManager');
export const createSSHSession = asyncNoop;
