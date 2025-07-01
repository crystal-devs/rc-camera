"use client";
import { CameraIcon, HomeIcon, ImageIcon, UserIcon, LifeBuoyIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: <HomeIcon size={20} />, label: "Home", href: "/" },
  { icon: <ImageIcon size={20} />, label: "Events", href: "/events" },
  { icon: <CameraIcon size={20} />, label: "Capture", href: "/capture" },
  { icon: <UserIcon size={20} />, label: "Profile", href: "/profile" },
  { icon: <LifeBuoyIcon size={20} />, label: "Diagnostics", href: "/diagnostic" }
];

export default function SidebarNav() {
  const pathname = usePathname();

  // Hide sidebar on login pages
  if (pathname.startsWith('/login')) {
    return null;
  }

  return (
    <nav className="flex flex-col gap-2 mt-8">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100 font-medium ${pathname === item.href ? 'bg-gray-100 text-primary' : ''}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
