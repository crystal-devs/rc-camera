import Image from 'next/image';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export interface CustomMerchandiseProduct {
    id: string;
    title: string;
    description: string;
    basePrice: number;
    imageUrl: string;
    category: 't-shirts' | 'mugs' | 'phone-cases' | 'tote-bags' | 'pillows';
    variants: {
        size?: string[];
        color?: string[];
        style?: string[];
    };
    rating: number;
    reviewCount: number;
    isCustomizable: boolean;
    printfulId?: string; // For print-on-demand integration
}

interface CustomMerchandiseCardProps {
    product: CustomMerchandiseProduct;
    onAddToCart: (product: CustomMerchandiseProduct) => void;
    onCustomize: (product: CustomMerchandiseProduct) => void;
}

export function CustomMerchandiseCard({ product, onAddToCart, onCustomize }: CustomMerchandiseCardProps) {
    return (
        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg">
            <div className="relative aspect-square overflow-hidden">
                <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.isCustomizable && (
                        <Badge variant="secondary" className="text-xs">
                            Customizable
                        </Badge>
                    )}
                    <Badge variant="outline" className="text-xs bg-white/90">
                        {product.category.replace('-', ' ')}
                    </Badge>
                </div>

                {/* Favorite button */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white"
                >
                    <Heart className="h-4 w-4" />
                </Button>

                {/* Quick actions overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => onCustomize(product)}
                            className="bg-white text-black hover:bg-gray-100"
                        >
                            Customize
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => onAddToCart(product)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Add to Cart
                        </Button>
                    </div>
                </div>
            </div>

            <CardContent className="p-4">
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-2">{product.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < Math.floor(product.rating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-sm text-gray-600">
                            {product.rating} ({product.reviewCount})
                        </span>
                    </div>

                    {/* Variants preview */}
                    {product.variants.size && (
                        <div className="flex flex-wrap gap-1">
                            {product.variants.size.slice(0, 3).map((size) => (
                                <Badge key={size} variant="outline" className="text-xs">
                                    {size}
                                </Badge>
                            ))}
                            {product.variants.size.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{product.variants.size.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-bold">${product.basePrice.toFixed(2)}</span>
                        <span className="text-sm text-gray-500">Starting at</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}