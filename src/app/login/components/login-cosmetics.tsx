"use client";

import Image from "next/image";
import loginImage from "@/assets/logan-voss-PAoo2lm4m0k-unsplash.jpg";

const LoginCosmetics = () => {
    return (
        <div className="hidden md:flex md:flex-col w-full h-full min-h-screen py-0 pr-0 text-white">
            {/* <div className="hidden md:flex md:flex-col w-full h-full min-h-screen bg-gradient-to-r from-violet-200 to-pink-200 text-white"> */}
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-8 z-0">
                {/* Background Image */}
                <Image
                    src={loginImage}
                    alt="Login Background"
                    fill
                    className="object-cover absolute inset-0"
                    priority
                    unoptimized
                />

                {/* Dark Overlay/Gradient for better aesthetic (optional, kept minimal as requested) */}
                <div className="absolute inset-0 bg-black/20" />

            </div>
        </div>
    );
};

export { LoginCosmetics };

