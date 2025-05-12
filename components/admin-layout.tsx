"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  GraduationCap,
  Users, 
  Settings,
  BookOpen,
  BarChart,
  MessageSquare
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const NavItem = ({ href, icon, label, active }: NavItemProps) => (
  <Link 
    href={href}
    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
      active ? "bg-purple-900 text-white" : "hover:bg-purple-900/50"
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
    },
    {
      href: "/admin/courses",
      icon: <BookOpen className="h-5 w-5" />,
      label: "Courses",
    },
    {
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      label: "Users",
    },
    {
      href: "/admin/feedback",
      icon: <MessageSquare className="h-5 w-5" />,
      label: "Feedback",
    },
    {
      href: "/admin/analytics",
      icon: <BarChart className="h-5 w-5" />,
      label: "Analytics",
    },
    {
      href: "/admin/settings",
      icon: <Settings className="h-5 w-5" />,
      label: "Settings",
    },
  ];

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-purple-500" />
            <h1 className="text-xl font-bold">Study Better</h1>
          </div>
          <div className="text-sm text-gray-400">Admin Dashboard</div>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href}
            />
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}