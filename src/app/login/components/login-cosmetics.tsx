"use client";

import cameAnimation from "@/assets/camera-lottie.json";
import dynamic from "next/dynamic";
import { Camera, Image, Users, Share, Heart } from 'lucide-react';

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export const LoginCosmetics = () => {
    return (
        <div className="hidden md:flex md:flex-col w-full h-full min-h-screen bg-gradient-to-b from-primary to-primary/80 text-white">
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-8">
                <div className="absolute top-8 left-8">
                    <h2 className="text-3xl font-bold flex items-center">
                        <Camera className="mr-2 h-8 w-8" />
                        Rose Click
                    </h2>
                </div>
                
                <div className="z-10">
                    <Lottie animationData={cameAnimation} loop={true} className="h-[500px]" />
                </div>
                
                <div className="mt-8 max-w-md text-center">
                    <h1 className="text-4xl font-bold mb-4">Share Memories Together</h1>
                    <p className="text-lg text-white/90 mb-8">
                        Capture, share, and relive special moments with friends and family in one place.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <FeatureItem icon={<Image className="h-6 w-6" />} title="Create Albums" />
                        <FeatureItem icon={<Users className="h-6 w-6" />} title="Group Events" />
                        <FeatureItem icon={<Share className="h-6 w-6" />} title="Easy Sharing" />
                        <FeatureItem icon={<Heart className="h-6 w-6" />} title="Save Favorites" />
                    </div>
                </div>
                
                {/* Background decorative elements */}
                <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/10 blur-xl"></div>
                <div className="absolute top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-xl"></div>
            </div>
        </div>
    );
};

// Feature Item component
const FeatureItem = ({ icon, title }: { icon: React.ReactNode, title: string }) => {
    return (
        <div className="flex items-center bg-white/10 backdrop-blur-sm p-3 rounded-lg">
            <div className="mr-3 text-primary-foreground">
                {icon}
            </div>
            <p className="font-medium">{title}</p>
        </div>
    );
};
