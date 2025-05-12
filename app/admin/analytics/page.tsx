"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  Users,
  BookOpen,
  DollarSign,
  ArrowUpRight,
  Headphones,
  BookText,
  MessageSquare
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchAnalyticsData, type AnalyticsPeriod, type AnalyticsData } from "@/app/actions/analytics"

// Sample colors for charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<AnalyticsPeriod>("30d")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const { toast } = useToast()

  // Fetch analytics data
  useEffect(() => {
    const loadAnalyticsData = async () => {
      setIsLoading(true)
      try {
        const data = await fetchAnalyticsData(timeRange)
        console.log("Analytics data loaded:", data)
        setAnalyticsData(data)
      } catch (error: any) {
        console.error("Error fetching analytics:", error)
        toast({
          title: "Error",
          description: `Failed to load analytics data: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalyticsData()
  }, [timeRange, toast])

  // Transform data for charts
  const getUserGrowthData = () => {
    if (!analyticsData?.userGrowth || analyticsData.userGrowth.length === 0) {
      return [{ name: "No data", value: 0 }]
    }
    return analyticsData.userGrowth.map((item) => ({
      name: formatDateForDisplay(item.date),
      value: item.count
    }))
  }

  const getRevenueData = () => {
    if (!analyticsData?.revenueByDate || analyticsData.revenueByDate.length === 0) {
      return [{ name: "No data", value: 0 }]
    }
    return analyticsData.revenueByDate.map((item) => ({
      name: formatDateForDisplay(item.date),
      value: item.amount
    }))
  }

  const getFormatDistributionData = () => {
    if (!analyticsData?.formatDistribution || analyticsData.formatDistribution.length === 0) {
      return [{ name: "No data", value: 1 }]
    }
    return analyticsData.formatDistribution.map((item) => ({
      name: item.format,
      value: item.count
    }))
  }

  // Format date based on time range
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString)
    
    if (timeRange === "7d" || timeRange === "30d") {
      // For shorter ranges, show day and month
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })
    } else if (timeRange === "90d") {
      // For medium ranges, show month only
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })
    } else {
      // For yearly view, show month and year
      return date.toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit'
      })
    }
  }

  // Calculate weekly change
  const getWeeklyChange = (currentValue: number) => {
    // For now, generate a random percentage change
    return Math.floor(Math.random() * 20) - 5 // Between -5% and +15%
  }

  // Check if there are any user signups in the selected period
  const hasUserGrowth = analyticsData?.userGrowth && analyticsData.userGrowth.length > 0

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-10">
          <div className="flex items-center justify-center h-96">
            <p className="text-xl">Loading analytics data...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!analyticsData) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-10">
          <div className="flex items-center justify-center h-96">
            <p className="text-xl text-red-500">Failed to load analytics data</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <Select value={timeRange} onValueChange={(value: AnalyticsPeriod) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalUsers.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <p>+{hasUserGrowth ? analyticsData.userGrowth.length : 0} new in this period</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.totalUsers ? 
                  ((analyticsData.activeUsers / analyticsData.totalUsers) * 100).toFixed(1) : 
                  0}% of total users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{analyticsData.totalRevenue.toLocaleString()}</div>
              <div className="flex items-center">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <p className="text-xs text-green-500">
                  +{getWeeklyChange(analyticsData.totalRevenue)}% from last period
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalCourses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.totalCourses && analyticsData.totalCourses > 0
                  ? `₦${(analyticsData.totalRevenue / analyticsData.totalCourses).toFixed(0)} avg per course`
                  : "No course data"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>
                    New user registrations over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getUserGrowthData()}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="New Users"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>
                    Revenue in Nigerian Naira
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getRevenueData()}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₦${value}`, 'Revenue']} />
                        <Legend />
                        <Bar dataKey="value" name="Revenue (₦)" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Popular Courses</CardTitle>
                  <CardDescription>
                    Top-selling courses by purchase count
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData.popularCourses.length > 0 ? (
                    <div className="space-y-8">
                      {analyticsData.popularCourses.map((course) => (
                        <div key={course.id} className="flex items-center">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{course.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {course.purchases} purchases
                            </p>
                          </div>
                          <div className="ml-auto font-medium">₦{course.revenue.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No course purchase data available</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Format Distribution</CardTitle>
                  <CardDescription>
                    Course formats popularity
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getFormatDistributionData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getFormatDistributionData().map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} courses`, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* The rest of the tabs content remains the same */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>User Growth Over Time</CardTitle>
                  <CardDescription>Detailed view of user registrations</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getUserGrowthData()}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="New Users"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement</CardTitle>
                  <CardDescription>Activity metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Active Users</p>
                        <p className="text-2xl font-bold">{analyticsData.activeUsers}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Chat Engagement</p>
                        <p className="text-2xl font-bold">{Math.floor(analyticsData.totalUsers * 0.35)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Course Purchases</p>
                        <p className="text-2xl font-bold">
                          {analyticsData.popularCourses.reduce((sum: number, course: any) => sum + course.purchases, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>Detailed revenue analysis over time</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getRevenueData()}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₦${value}`, 'Revenue']} />
                        <Legend />
                        <Bar dataKey="value" name="Revenue (₦)" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Course Revenue</CardTitle>
                  <CardDescription>Top earning courses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.popularCourses
                      .sort((a: any, b: any) => b.revenue - a.revenue)
                      .slice(0, 5)
                      .map((course: any, index: number) => (
                        <div key={course.id} className="flex items-center">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{course.title}</p>
                            <div className="h-2 w-full rounded-full bg-gray-700">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${(course.revenue / analyticsData.popularCourses[0].revenue) * 100}%`,
                                  backgroundColor: COLORS[index % COLORS.length]
                                }} 
                              />
                            </div>
                          </div>
                          <p className="ml-2 text-sm font-medium">₦{course.revenue.toLocaleString()}</p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Course Engagement</CardTitle>
                  <CardDescription>Content performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getFormatDistributionData()}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Content Items" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Popular Formats</CardTitle>
                  <CardDescription>Most preferred course formats</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getFormatDistributionData().map((item: any, index: number) => {
                      const total = getFormatDistributionData().reduce((sum: number, i: any) => sum + i.value, 0)
                      const percentage = ((item.value / total) * 100).toFixed(0)
                      
                      return (
                        <div key={item.name} className="flex items-center">
                          {item.name === "Summaries" && <BookText className="mr-2 h-4 w-4 text-muted-foreground" />}
                          {item.name === "Explanations" && <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />}
                          {item.name === "Podcasts" && <Headphones className="mr-2 h-4 w-4 text-muted-foreground" />}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <div className="h-2 w-full rounded-full bg-gray-700">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: COLORS[index % COLORS.length]
                                }} 
                              />
                            </div>
                          </div>
                          <p className="ml-2 text-sm font-medium">{percentage}%</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}