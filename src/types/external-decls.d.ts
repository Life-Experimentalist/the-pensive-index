// Temporary declarations for external modules without type packages
declare module 'ioredis' {
  const Redis: any;
  export default Redis;
}

declare module 'lru-cache' {
  export const LRUCache: any;
  const _default: any;
  export default _default;
}
