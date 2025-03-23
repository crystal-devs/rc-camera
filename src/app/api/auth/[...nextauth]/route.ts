import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import InstagramProvider from 'next-auth/providers/instagram';
import { NextAuthOptions } from 'next-auth';
// import { saveUserToDatabase, updateUserToken } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Request more scopes if you need additional data
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
    //   if (user && account && profile) {
    //     await saveUserToDatabase(user, account, profile);
    //   }

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        // Add the user ID to the session
        session.user.id = token.sub as string;
        
        // Add provider to the session
        session.user.provider = token.provider as string;
        
        // Add any other custom fields from your database
        // This requires extending the Session type in next-auth.d.ts
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
      
      // Check if token needs refreshing (if you implement token refresh)
      // if (token.expiresAt && Date.now() > token.expiresAt * 1000) {
      //   // Refresh token logic here
      // }
      
      return token;
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