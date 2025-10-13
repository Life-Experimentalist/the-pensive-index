declare module '@clerk/nextjs' {
  export function auth(): { userId?: string };
  // minimal shim - extend as needed
}
