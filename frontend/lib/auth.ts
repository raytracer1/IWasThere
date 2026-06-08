import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { SignJWT } from "jose";

const AUTH_SECRET = process.env.AUTH_SECRET;

/**
 * Generate an API access token (JWT) that can be verified by the Cloudflare Worker.
 * Uses the same AUTH_SECRET so both sides can sign/verify.
 */
async function generateAccessToken(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<string> {
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET is not set");

  const encoder = new TextEncoder();
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name ?? undefined,
    picture: user.image ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(encoder.encode(AUTH_SECRET));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      // On sign-in or when token is refreshed, generate an API access token
      if (account && profile) {
        token.provider = account.provider;
        token.email = profile.email ?? token.email;
        token.name = profile.name ?? token.name;
        token.picture =
          (profile as { picture?: string; avatar_url?: string }).picture ??
          (profile as { avatar_url?: string }).avatar_url ??
          token.picture ?? "";
      }

      // Regenerate access token on sign-in or when explicitly updated
      if (trigger === "signIn" || trigger === "signUp" || !token.accessToken) {
        token.accessToken = await generateAccessToken({
          id: token.sub!,
          email: token.email as string,
          name: token.name as string | null,
          image: token.picture as string | null,
        });
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? "";
        session.user.image = (token.picture as string) ?? "";
      }
      // Expose the access token to the client for Worker API calls
      return {
        ...session,
        accessToken: token.accessToken as string,
      };
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
});
