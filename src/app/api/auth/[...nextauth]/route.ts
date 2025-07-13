// app/api/auth/[...nextauth]/route.ts - Updated with better redirect handling

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import InstagramProvider from 'next-auth/providers/instagram';
import { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID as string,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('========= AUTH PROVIDER RESPONSE =========');
      console.log('User data:', JSON.stringify(user, null, 2));
      console.log('Account data:', JSON.stringify(account, null, 2));
      console.log('Profile data:', JSON.stringify(profile, null, 2));
      console.log('========= END AUTH PROVIDER RESPONSE =========');

      // Save user data to your database
      // if (user && account && profile) {
      //   await saveUserToDatabase(user, account, profile);
      // }

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        // Add the user ID to the session
        session.user.id = token.sub as string;

        // Add provider to the session
        session.user.provider = token.provider as string;

        // Add access token if available
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;

        // Store access token info in the token
        if (account.access_token) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
        }
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect:', { url, baseUrl });

      // Allows relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }

      // For co-host invites, preserve the full URL
      if (url.includes('/events/join-cohost/')) {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          return url;
        }
      }

      return baseUrl;
    }
  },
  events: {
    async signIn({ user, account }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`);
    },
    async updateUser({ user }) {
      console.log(`User ${user.email} updated`);
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// types/next-auth.d.ts - Add this to extend NextAuth types
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      provider?: string;
    }
  }

  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    provider?: string;
    providerAccountId?: string;
  }
}