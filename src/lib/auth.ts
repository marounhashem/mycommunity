import { NextAuthOptions } from "next-auth";
import { Adapter, AdapterUser, AdapterSession, VerificationToken } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { compare } from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const customAdapter: Adapter = {
  createUser: async (data: Omit<AdapterUser, "id">) => {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        role: "OWNER",
      },
    });
    return { id: user.id, email: user.email, role: user.role, emailVerified: null };
  },
  getUser: async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role, emailVerified: null };
  },
  getUserByEmail: async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role, emailVerified: null };
  },
  getUserByAccount: async () => null,
  updateUser: async ({ id }: Partial<AdapterUser> & Pick<AdapterUser, "id">) => {
    const user = await prisma.user.update({ where: { id }, data: {} });
    return { id: user.id, email: user.email, role: user.role, emailVerified: null };
  },
  linkAccount: async () => undefined,
  createSession: async (_session: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> => {
    throw new Error("JWT strategy — no DB sessions");
  },
  getSessionAndUser: async () => null,
  updateSession: async () => null,
  deleteSession: async () => {},
  createVerificationToken: async (data: VerificationToken) => {
    const token = await prisma.verificationToken.create({ data });
    return token;
  },
  useVerificationToken: async ({ identifier, token }: { identifier: string; token: string }) => {
    try {
      const result = await prisma.verificationToken.delete({
        where: { identifier_token: { identifier, token } },
      });
      return result;
    } catch {
      return null;
    }
  },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) return null;

        const isValid = await compare(
          credentials.password,
          user.hashedPassword
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY!,
        },
      },
      from: process.env.EMAIL_FROM || "MyCommunity <noreply@mycommunity.app>",
      async sendVerificationRequest({ identifier: email, url }) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:
            process.env.EMAIL_FROM || "MyCommunity <noreply@mycommunity.app>",
          to: email,
          subject: "Sign in to MyCommunity",
          html: `
            <div style="max-width:400px;margin:0 auto;padding:24px;font-family:sans-serif">
              <div style="text-align:center;margin-bottom:24px">
                <div style="display:inline-block;background:#7A1022;width:40px;height:40px;line-height:40px;text-align:center">
                  <span style="color:white;font-size:8px;font-weight:bold">TERRA<br>STATE</span>
                </div>
              </div>
              <h2 style="text-align:center;color:#2C2014">Sign in to MyCommunity</h2>
              <p style="color:#6B7F5B;text-align:center">Click the button below to sign in to your account.</p>
              <div style="text-align:center;margin:24px 0">
                <a href="${url}" style="background:#7A1022;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
                  Sign In
                </a>
              </div>
              <p style="color:#6B7F5B;text-align:center;font-size:12px">If you didn't request this, you can ignore this email.</p>
            </div>
          `,
        });
      },
    }),
  ],
  adapter: customAdapter,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          user.id = dbUser.id;
          user.role = dbUser.role;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        token.needsPassword = dbUser ? !dbUser.hashedPassword : false;
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
  },
};
