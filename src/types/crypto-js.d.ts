declare module 'crypto-js' {
  function SHA256(message: string): { toString: () => string }
  export = { SHA256 }
}
