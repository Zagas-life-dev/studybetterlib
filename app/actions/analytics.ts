"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "1y" | "all"

export interface AnalyticsData {
  totalUsers: number
  activeUsers: number
  totalCourses: number
  totalRevenue: number
  userGrowth: {
    date: string
    count: number
  }[]
  revenueByDate: {
    date: string
    amount: number
  }[]
  popularCourses: {
    id: string
    title: string
    purchases: number
    revenue: number
  }[]
  formatDistribution: {
    format: string
    count: number
  }[]
}

/**
 * Fetch analytics data based on time period
 */
export async function fetchAnalyticsData(period: AnalyticsPeriod): Promise<AnalyticsData> {
  // Create the Supabase client - note that this is now an async function call
  const supabase = await createClient()
  
  // Calculate date range
  const endDate = new Date()
  let startDate = new Date()
  
  switch(period) {
    case "7d":
      startDate.setDate(endDate.getDate() - 7)
      break
    case "30d":
      startDate.setDate(endDate.getDate() - 30)
      break
    case "90d":
      startDate.setDate(endDate.getDate() - 90)
      break
    case "1y":
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
    case "all":
      startDate = new Date(0) // Beginning of time
      break
  }
  
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
    
    if (usersError) console.error("Error fetching users:", usersError)
    
    // Get active users (users who logged in within period)
    const { count: activeUsers, error: activeError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_sign_in", startDate.toISOString())
    
    if (activeError) console.error("Error fetching active users:", activeError)
    
    // Get total courses
    const { count: totalCourses, error: coursesError } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })
    
    if (coursesError) console.error("Error fetching courses:", coursesError)
    
    // Get orders for revenue calculation
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", startDate.toISOString())
    
    if (ordersError) console.error("Error fetching orders:", ordersError)
    
    // Calculate total revenue
    const totalRevenue = orders ? 
      orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) : 
      0
    
    // Get user growth data (new registrations by date)
    const { data: newUsers, error: newUsersError } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true })
    
    if (newUsersError) console.error("Error fetching new users:", newUsersError)
    
    // Process user growth by date
    const userGrowthMap = new Map<string, number>()
    
    if (newUsers) {
      for (const user of newUsers) {
        const date = new Date(user.created_at).toISOString().split('T')[0]
        userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1)
      }
    }
    
    const userGrowth = Array.from(userGrowthMap.entries()).map(([date, count]) => ({
      date,
      count
    }))
    
    // Process revenue by date
    const revenueMap = new Map<string, number>()
    
    if (orders) {
      for (const order of orders) {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        revenueMap.set(date, (revenueMap.get(date) || 0) + (order.total_amount || 0))
      }
    }
    
    const revenueByDate = Array.from(revenueMap.entries()).map(([date, amount]) => ({
      date,
      amount
    }))
    
    // Get popular courses (by purchase count)
    const courseRevenueMap = new Map<string, { purchases: number, revenue: number, title: string }>()
    
    if (orders) {
      for (const order of orders) {
        if (!order.course_id) continue
        
        const current = courseRevenueMap.get(order.course_id) || { 
          purchases: 0, 
          revenue: 0, 
          title: 'Unknown Course' 
        }
        
        courseRevenueMap.set(order.course_id, {
          ...current,
          purchases: current.purchases + 1,
          revenue: current.revenue + (order.total_amount || 0)
        })
      }
    }
    
    // Fetch course titles
    if (courseRevenueMap.size > 0) {
      const courseIds = Array.from(courseRevenueMap.keys())
      
      const { data: courses, error: courseTitlesError } = await supabase
        .from("courses")
        .select("id, title")
        .in("id", courseIds)
      
      if (courseTitlesError) console.error("Error fetching course titles:", courseTitlesError)
      
      if (courses) {
        for (const course of courses) {
          const courseData = courseRevenueMap.get(course.id)
          if (courseData) {
            courseRevenueMap.set(course.id, {
              ...courseData,
              title: course.title
            })
          }
        }
      }
    }
    
    const popularCourses = Array.from(courseRevenueMap.entries())
      .map(([id, { title, purchases, revenue }]) => ({
        id,
        title,
        purchases,
        revenue
      }))
      .sort((a, b) => b.purchases - a.purchases)
      .slice(0, 5)
    
    // Placeholder for format distribution (modify as needed based on your schema)
    const formatDistribution = [
      { format: "Summaries", count: 45 },
      { format: "Explanations", count: 30 },
      { format: "Podcasts", count: 25 }
    ]
    
    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalCourses: totalCourses || 0,
      totalRevenue,
      userGrowth,
      revenueByDate,
      popularCourses,
      formatDistribution
    }
  } catch (error) {
    console.error("Analytics error:", error)
    // Return fallback data if there's an error
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalCourses: 0,
      totalRevenue: 0,
      userGrowth: [],
      revenueByDate: [],
      popularCourses: [],
      formatDistribution: [
        { format: "Summaries", count: 45 },
        { format: "Explanations", count: 30 },
        { format: "Podcasts", count: 25 }
      ]
    }
  }
}