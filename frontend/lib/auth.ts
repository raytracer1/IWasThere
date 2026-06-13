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
