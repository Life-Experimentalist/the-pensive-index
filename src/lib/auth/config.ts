import { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { DatabaseManager } from '@/lib/database';
import { schema } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

/**
 * NextAuth configuration with admin role support
 */
export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (!session.user) return session;

      try {
        const db = await DatabaseManager.getInstance().getConnection();
        
        // Get admin user details if exists
        const adminUser = await db.query.adminUsers.findFirst({
          where: eq(schema.adminUsers.email, session.user.email!),
          columns: {
            id: true,
            role: true,
            fandom_access: true,
            permissions: true,
            is_active: true,
          },
        });

        if (adminUser && adminUser.is_active) {
          session.user.id = adminUser.id;
          session.user.role = adminUser.role;
          session.user.fandomAccess = adminUser.fandom_access || [];
          session.user.permissions = adminUser.permissions || [];
          session.user.isAdmin = true;
        } else {
          // Regular user (not admin)
          session.user.isAdmin = false;
          session.user.role = null;
          session.user.fandomAccess = [];
          session.user.permissions = [];
        }
      } catch (error) {
        console.error('Session callback error:', error);
        // Fallback to non-admin user
        session.user.isAdmin = false;
        session.user.role = null;
        session.user.fandomAccess = [];
        session.user.permissions = [];
      }

      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};