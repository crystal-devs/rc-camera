import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Product {
    id: string;
    title: string;
    price: number;
    imageUrl: string;
    type: 'physical' | 'digital';
}

interface ShopProductCardProps {
    product: Product;
}

export function ShopProductCard({ product }: ShopProductCardProps) {
    return (
        <div className="group relative flex flex-col items-start space-y-3 cursor-pointer">
            <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800">
                <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                />

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-md">
                        <ShoppingCart className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="w-full">
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">{product.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">From ${product.price.toFixed(2)}</p>
            </div>
        </div>
    );
}
