declare module '@clerk/nextjs' {
  // Minimal local type declarations to satisfy imports in client components.
  // The real package ships full types in node_modules; this shim avoids
  // occasional resolution mismatches during local dev. Extend only as needed.

  export function auth(): { userId?: string };

  export function useAuth(): {
    userId?: string | null;
    isLoaded?: boolean;
    isSignedIn?: boolean;
  };

  export function useUser(): {
    isLoaded: boolean;
    isSignedIn: boolean;
    user?: {
      id: string;
      primaryEmailAddress?: { emailAddress?: string } | null;
      publicMetadata?: Record<string, any>;
      unsafeMetadata?: Record<string, any>;
    } | null;
  };

  export const SignOutButton: any;
  export const SignInButton: any;
  export const UserButton: any;
  export const ClerkProvider: any;
}
