'use client';
import { CameraIcon, HomeIcon, MenuIcon, UserIcon, UsersIcon, XIcon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

// NavItem component definition
const NavItem = ({ icon, label, href }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  return (
    <Link href={href} className="block">
      <div className={`flex items-center px-4 py-3 hover:bg-gray-100 transition-colors ${isActive ? "bg-gray-50" : ""}`}>
        <div className={`mr-3 ${isActive ? "text-primary" : "text-gray-500"}`}>
          {icon}
        </div>
        <span className={`${isActive ? "font-medium text-primary" : "text-gray-700"}`}>
          {label}
        </span>
      </div>
    </Link>
  );
};

const FloatingNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-3 h-14 w-14 shadow-lg"
        size="icon"
      >
        {isOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </Button>
      
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl w-56 overflow-hidden">
          <NavItem icon={<HomeIcon size={20} />} label="Home" href="/" />
          <NavItem icon={<CameraIcon size={20} />} label="Capture" href="/capture" />
          <NavItem icon={<UsersIcon size={20} />} label="Events" href="/events" />
          <NavItem icon={<UserIcon size={20} />} label="Profile" href="/profile" />
        </div>
      )}
    </div>
  );
};

export default FloatingNav;