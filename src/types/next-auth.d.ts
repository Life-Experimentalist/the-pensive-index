import 'next-auth';
import { AdminUser } from '@/lib/database/schema';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'ProjectAdmin' | 'FandomAdmin' | null;
      fandomAccess?: string[];
      permissions?: Array<{
        id: string;
        name: string;
        description: string;
        scope: 'global' | 'fandom' | 'content';
      }>;
      isAdmin?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    role?: 'ProjectAdmin' | 'FandomAdmin';
    fandomAccess?: string[];
    permissions?: Array<{
      id: string;
      name: string;
      description: string;
      scope: 'global' | 'fandom' | 'content';
    }>;
    isAdmin?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'ProjectAdmin' | 'FandomAdmin' | null;
    fandomAccess?: string[];
    permissions?: Array<{
      id: string;
      name: string;
      description: string;
      scope: 'global' | 'fandom' | 'content';
    }>;
    isAdmin?: boolean;
  }
}

export {};