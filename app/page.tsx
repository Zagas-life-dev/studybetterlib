import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server"
import Header from "@/components/header"
import { Shield, BookOpen, Clock } from "lucide-react"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <div className="flex min-h-screen flex-col">
      <Header session={session} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <h1 className="text-5xl font-bold mb-6">
                  Study Smarter, Not Harder with <span className="text-purple-500">AI-Powered Learning</span>
                </h1>
                <p className="text-lg text-gray-300 mb-8">
                  Access comprehensive course materials tailored for students. Summaries, explanations, and audio
                  formats to match your learning style.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/library">Browse Library</Link>
                  </Button>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="bg-gray-900 p-6 rounded-lg space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Comprehensive Summaries</h3>
                    <p className="text-gray-400">Concise overviews of key concepts</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Detailed Explanations</h3>
                    <p className="text-gray-400">In-depth analysis of complex topics</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Audio Podcasts</h3>
                    <p className="text-gray-400">Learn on the go with audio content</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex justify-center mb-2">
              <div className="bg-purple-900/50 text-purple-300 px-4 py-1 rounded-full text-sm">Features</div>
            </div>
            <h2 className="text-4xl font-bold text-center mb-6">Everything You Need to Excel</h2>
            <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
              Our platform is designed to help students succeed with comprehensive study materials in multiple formats.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                <div className="w-12 h-12 mb-4 text-purple-500">
                  <Shield className="w-full h-full" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Quality Content</h3>
                <p className="text-gray-400">
                  High-quality study materials created by experts to ensure accuracy and relevance.
                </p>
              </div>

              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                <div className="w-12 h-12 mb-4 text-purple-500">
                  <BookOpen className="w-full h-full" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Multiple Formats</h3>
                <p className="text-gray-400">
                  Choose from summaries, detailed explanations, audio podcasts, or combo packages.
                </p>
              </div>

              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                <div className="w-12 h-12 mb-4 text-purple-500">
                  <Clock className="w-full h-full" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Lifetime Access</h3>
                <p className="text-gray-400">
                  Purchase once and access your materials forever through your personal dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-[#4c2a9c]">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Learning Experience?</h2>
            <p className="text-lg mb-8">
              Join thousands of students who are already studying smarter with our comprehensive course materials.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-white text-purple-900 hover:bg-gray-200">
                <Link href="/signup">Sign Up Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-purple-800">
                <Link href="/library">Explore Courses</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Study Better AI. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
