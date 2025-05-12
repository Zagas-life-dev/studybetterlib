import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, BookOpen, Headphones, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default async function Cart() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch cart items
  const { data: cartItems } = await supabase.from("cart_items").select("*, courses(*)").eq("user_id", session.user.id)

  return (
    <div className="flex min-h-screen flex-col">
      <Header session={session} />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

          {cartItems && cartItems.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-gray-900/50 rounded-lg border border-gray-800">
                  {cartItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 flex flex-wrap md:flex-nowrap items-center justify-between ${
                        index !== cartItems.length - 1 ? "border-b border-gray-800" : ""
                      }`}
                    >
                      <div className="w-full md:w-auto mb-4 md:mb-0">
                        <h3 className="font-medium">{item.courses.title}</h3>
                        <p className="text-sm text-gray-400">{item.courses.faculty}</p>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto mb-4 md:mb-0">
                        {item.formats.includes("summary") && (
                          <div className="flex items-center text-xs bg-gray-800 px-2 py-1 rounded">
                            <FileText className="h-3 w-3 mr-1" />
                            <span>Summary</span>
                          </div>
                        )}

                        {item.formats.includes("explanation") && (
                          <div className="flex items-center text-xs bg-gray-800 px-2 py-1 rounded">
                            <BookOpen className="h-3 w-3 mr-1" />
                            <span>Explanation</span>
                          </div>
                        )}

                        {item.formats.includes("podcast") && (
                          <div className="flex items-center text-xs bg-gray-800 px-2 py-1 rounded">
                            <Headphones className="h-3 w-3 mr-1" />
                            <span>Podcast</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full md:w-auto">
                        <p className="font-bold">₦{item.price.toLocaleString()}</p>
                        <form action="/api/cart/remove" method="POST">
                          <input type="hidden" name="itemId" value={item.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Subtotal</span>
                        <span>₦{cartItems.reduce((total, item) => total + item.price, 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tax</span>
                        <span>₦0</span>
                      </div>
                      <div className="border-t border-gray-800 pt-2 mt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>₦{cartItems.reduce((total, item) => total + item.price, 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">Proceed to Checkout</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
              <p className="text-gray-400 mb-8">Browse our courses and add some to your cart.</p>
              <Button asChild>
                <Link href="/library">Browse Courses</Link>
              </Button>
            </div>
          )}
        </div>
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
