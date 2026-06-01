import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          // We explicitly request 'repo' so the token can access private repositories
          scope: "read:user repo",
        },
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  trustHost: true, // Helps in some dev/prod setups with custom domains
  debug: process.env.NODE_ENV === "development", // Logs helpful info in dev
  callbacks: {
    async jwt({ token, account }) {
      // Persist the GitHub access token to the JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the GitHub access token to the client session
      // This is what allows us to call GitHub API directly from the browser
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});

// Extend the types so TypeScript knows about accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
