import Link from 'next/link'
import SignupForm from '@/components/auth/SignupForm'
import { Card, CardContent } from '@/components/ui'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cycler</h1>
          <p className="text-gray-600 dark:text-gray-400">Create your account</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <SignupForm />
            <div className="mt-4 text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
              <Link href="/login" className="text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 font-medium">
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

