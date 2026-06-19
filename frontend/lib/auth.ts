import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SignJWT } from "jose";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google") {
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

        // Call backend to create user on first login
        const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://localhost:8787';
        try {
          const loginRes = await fetch(`${workerUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sub: token.sub,
              email: token.email,
              name: token.name,
              picture: token.picture,
            }),
          });

          // Track first-time sign-ups via Pendo server-side API
          try {
            const loginData = await loginRes.json() as { success?: boolean; data?: { createdAt?: number } };
            if (loginData?.success && loginData?.data?.createdAt) {
              const nowSec = Math.floor(Date.now() / 1000);
              if (nowSec - loginData.data.createdAt < 30) {
                fetch('https://data.pendo.io/data/track', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-pendo-integration-key': '96972531-a74b-4f1e-997e-bf1a54d420af',
                  },
                  body: JSON.stringify({
                    type: 'track',
                    event: 'user_signed_up',
                    visitorId: token.sub || 'unknown',
                    accountId: 'system',
                    timestamp: Date.now(),
                    properties: {
                      auth_provider: 'google',
                      email_domain: (token.email as string)?.split('@')[1] || '',
                    },
                  }),
                }).catch(() => {});
              }
            }
          } catch {
            // Non-critical — don't break auth flow for tracking
          }
        } catch {
          // Non-critical — user creation can be retried later
        }

        token.accessToken = await new SignJWT({
          sub: token.sub,
          email: token.email,
          name: token.name,
          picture: token.picture,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("30d")
          .sign(secret);
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        user: {
          ...session.user,
          id: token.sub,
        },
      };
    },
  },
  pages: {
    signIn: "/admin",
  },
});
