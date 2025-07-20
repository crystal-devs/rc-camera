'use client';

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "./ui/sidebar";
import { ThemeProvider } from "@/lib/ThemeContext";

interface ProvidersProps {
    children: React.ReactNode;
}

function Providers({ children }: ProvidersProps) {
    return (
        <>
            <SessionProvider>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </SessionProvider>
        </>
    );
}

export default Providers;