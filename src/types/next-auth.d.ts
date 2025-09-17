import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      budget: number
      budgetInitial: number
    }
  }

  interface User {
    id: string
    email: string
    budget: number
    budgetInitial: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    budget: number
    budgetInitial: number
  }
}
