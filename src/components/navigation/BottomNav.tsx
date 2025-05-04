'use client';
import { CameraIcon, HomeIcon, ImageIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const BottomNav = () => {
  const pathname = usePathname();
  
  // Hide bottom nav on login pages
  if (pathname.startsWith('/login')) {
    return null;
  }
  
  const navItems = [
    { icon: <HomeIcon size={20} />, label: "Home", href: "/" },
    { icon: <ImageIcon size={20} />, label: "Events", href: "/events" },
    { icon: <CameraIcon size={20} />, label: "Capture", href: "/capture" },
    { icon: <UserIcon size={20} />, label: "Profile", href: "/profile" }
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-3 flex justify-around z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center"
          >
            <div className={`${isActive ? "text-primary" : "text-gray-500"}`}>
              {item.icon}
            </div>
            <span className={`text-xs mt-1 ${isActive ? "text-primary font-medium" : "text-gray-600"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;