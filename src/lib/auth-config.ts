import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  debug: true, // Enable debug for production too
  logger: {
    error(code, metadata) {
      console.error('❌ NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('⚠️ NextAuth Warning:', code)
    },
    debug(code, metadata) {
      console.log('🔍 NextAuth Debug:', code, metadata)
    }
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      console.log('🔍 SignIn callback triggered:', {
        provider: account?.provider,
        userEmail: user?.email,
        userName: user?.name
      })

      if (account?.provider === 'google') {
        try {
          // Check if user exists in Supabase
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('❌ Error fetching user:', fetchError)
            return false
          }

          // If user doesn't exist, create them
          if (!existingUser) {
            console.log('✅ Creating new user for:', user.email)
            const { error: insertError } = await supabase
              .from('users')
              .insert([
                {
                  email: user.email,
                  name: user.name,
                  avatar_url: user.image,
                  provider: 'google',
                  provider_id: account.providerAccountId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              ])

            if (insertError) {
              console.error('❌ Error creating user:', insertError)
              return false
            }
            console.log('✅ User created successfully')
          } else {
            console.log('✅ Existing user found:', existingUser.email)
          }

          return true
        } catch (error) {
          console.error('Sign in error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, account, user }: { token: any; account: any; user: any }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user?.email) {
        // Fetch user data from Supabase
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single()

        if (userData) {
          session.user.id = userData.id
          session.user.provider = userData.provider
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/join',
    error: '/join',
  },
  session: {
    strategy: 'jwt' as const,
  },
}
