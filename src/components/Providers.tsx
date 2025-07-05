'use client';

import { SidebarProvider } from "./ui/sidebar";
import { ThemeProvider } from "@/lib/ThemeContext";

interface ProvidersProps {
    children: React.ReactNode;
}

function Providers({ children }: ProvidersProps) {
    return (
        <>
            <ThemeProvider>
                <SidebarProvider>
                    {children}
                </SidebarProvider>
            </ThemeProvider>
        </>
    );
}

export default Providers;