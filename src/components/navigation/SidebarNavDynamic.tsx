"use client";

import dynamic from "next/dynamic";

const SidebarNav = dynamic(() => import("@/components/navigation/SidebarNav"), { ssr: false });

export default SidebarNav;
