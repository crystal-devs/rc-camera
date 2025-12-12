import { useRef } from 'react';
import { Product, ShopProductCard } from './ShopProductCard';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ShopCategorySectionProps {
    title: string;
    id: string;
    products: Product[];
}

export function ShopCategorySection({ title, id, products }: ShopCategorySectionProps) {
    return (
        <section id={id} className="py-12 md:py-16 border-t border-gray-100 dark:border-gray-800 first:border-0">
            <div className="container mx-auto px-4 space-y-8">
                <div className="flex flex-col space-y-2">
                    <span className="text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                        Top Picks
                    </span>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white uppercase">
                        {title}
                    </h2>
                    <div className="h-0.5 w-12 bg-gray-900 dark:bg-white mt-2"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                    {products.map((product) => (
                        <ShopProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    );
}
