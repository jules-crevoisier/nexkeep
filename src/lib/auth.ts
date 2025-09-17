import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("Missing credentials");
            return null
          }

          console.log("Attempting to find user:", credentials.email);

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user) {
            console.log("User not found");
            return null
          }

          console.log("User found, checking password");

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.log("Invalid password");
            return null
          }

          console.log("Authentication successful");

          return {
            id: user.id,
            email: user.email,
            budget: user.budget,
            budgetInitial: user.budgetInitial,
          }
        } catch (error) {
          console.error("Auth error:", error);
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.budget = user.budget
        token.budgetInitial = user.budgetInitial
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.budget = token.budget as number
        session.user.budgetInitial = token.budgetInitial as number
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    signUp: "/register"
  },
  debug: process.env.NODE_ENV === "development"
}
