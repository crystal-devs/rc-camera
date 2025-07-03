'use client';

import { SidebarProvider } from "./ui/sidebar";

interface ProvidersProps {
    children: React.ReactNode;
}

function Providers({ children }: ProvidersProps) {
    return (
        <>
            <SidebarProvider>
                {children}
            </SidebarProvider>

        </>
    );
}

export default Providers;