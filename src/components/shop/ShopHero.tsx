import Image from 'next/image';

export function ShopHero() {
    return (
        <div className="relative w-full h-[50vh] md:h-[60vh] bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center">
            <div className="container mx-auto px-4 z-10 flex flex-col md:flex-row items-center justify-between h-full">
                <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6 slide-in-from-left-10 animate-in fade-in duration-700">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
                        METAL PRINTS
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-md">
                        Make a statement in any space with vibrant colors printed on high quality aluminum.
                    </p>
                </div>

                {/* Decorative Hero Image - Using a placeholder for now which will be replaced or provided by parent */}
                <div className="hidden md:block w-1/2 h-full relative">
                    <Image
                        src="https://images.unsplash.com/photo-1543487945-139a97f387d5?q=80&w=680&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="Metal Print Hero"
                        fill
                        className="object-cover object-center [mask-image:linear-gradient(to_left,black,transparent_100%)]"
                        priority
                    />
                </div>
            </div>

            {/* Gradient overlay for text readability if needed */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-gray-900 dark:via-gray-900/80 pointer-events-none md:hidden" />
        </div>
    );
}
