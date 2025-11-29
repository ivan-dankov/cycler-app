import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'
import { Card, CardContent } from '@/components/ui'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cycler</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <LoginForm />
            <div className="mt-4 text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link href="/signup" className="text-gray-900 hover:text-gray-700 font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

