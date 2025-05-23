"use client";

import cameAnimation from "@/assets/camera-lottie.json";
import dynamic from "next/dynamic";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });


export const LoginCosmetics = () => {
    return (
        <div className="hidden md:inline-block w-full h-full min-h-screen bg-primary">
            <div className=' relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-4'>
                <Lottie animationData={cameAnimation} loop={true} className='h-[700px]' />
            </div>
        </div>
    )
}
