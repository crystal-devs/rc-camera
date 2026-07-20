import { Check, Star, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SubscriptionTier {
    id: string;
    name: string;
    description: string;
    price: number;
    interval: 'month' | 'year';
    features: string[];
    limits: {
        storage: number; // GB
        events: number;
        guests: number;
        downloads: number;
    };
    popular?: boolean;
    current?: boolean;
    icon: 'star' | 'zap' | 'crown';
}

interface SubscriptionTierCardProps {
    tier: SubscriptionTier;
    onSelect: (tier: SubscriptionTier) => void;
    onUpgrade?: (tier: SubscriptionTier) => void;
}

export function SubscriptionTierCard({ tier, onSelect, onUpgrade }: SubscriptionTierCardProps) {
    const getIcon = () => {
        switch (tier.icon) {
            case 'star':
                return <Star className="h-6 w-6" />;
            case 'zap':
                return <Zap className="h-6 w-6" />;
            case 'crown':
                return <Crown className="h-6 w-6" />;
            default:
                return <Star className="h-6 w-6" />;
        }
    };

    const formatPrice = () => {
        if (tier.interval === 'year') {
            const monthlyPrice = tier.price / 12;
            return {
                price: tier.price,
                monthly: monthlyPrice.toFixed(2),
                interval: 'year',
                savings: 'Save 17%'
            };
        }
        return {
            price: tier.price,
            interval: 'month'
        };
    };

    const priceInfo = formatPrice();

    return (
        <Card className={`relative transition-all duration-300 hover:shadow-lg ${tier.popular ? 'ring-2 ring-blue-500 shadow-lg' : ''
            } ${tier.current ? 'ring-2 ring-green-500' : ''}`}>
            {/* Popular badge */}
            {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-3 py-1">
                        Most Popular
                    </Badge>
                </div>
            )}

            {/* Current plan badge */}
            {tier.current && (
                <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Current Plan
                    </Badge>
                </div>
            )}

            <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                    <div className={`p-3 rounded-full ${tier.icon === 'crown' ? 'bg-yellow-100 text-yellow-600' :
                            tier.icon === 'zap' ? 'bg-blue-100 text-blue-600' :
                                'bg-gray-100 text-gray-600'
                        }`}>
                        {getIcon()}
                    </div>
                </div>

                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{tier.description}</p>

                <div className="mt-4">
                    <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold">${priceInfo.price}</span>
                        <span className="text-gray-600 ml-1">/{priceInfo.interval}</span>
                    </div>

                    {priceInfo.monthly && (
                        <div className="text-sm text-gray-600 mt-1">
                            ${priceInfo.monthly}/month billed annually
                            {priceInfo.savings && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                    {priceInfo.savings}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Limits */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Plan Limits</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Storage:</span>
                            <span>{tier.limits.storage}GB</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Events:</span>
                            <span>{tier.limits.events === -1 ? 'Unlimited' : tier.limits.events}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Guests:</span>
                            <span>{tier.limits.guests === -1 ? 'Unlimited' : tier.limits.guests}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Downloads:</span>
                            <span>{tier.limits.downloads === -1 ? 'Unlimited' : tier.limits.downloads}</span>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Features</h4>
                    <ul className="space-y-1">
                        {tier.features.map((feature, index) => (
                            <li key={index} className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Action button */}
                <div className="pt-4">
                    {tier.current ? (
                        <Button
                            className="w-full"
                            variant="outline"
                            disabled
                        >
                            Current Plan
                        </Button>
                    ) : onUpgrade ? (
                        <Button
                            className="w-full"
                            onClick={() => onUpgrade(tier)}
                            variant={tier.popular ? 'default' : 'outline'}
                        >
                            Upgrade to {tier.name}
                        </Button>
                    ) : (
                        <Button
                            className="w-full"
                            onClick={() => onSelect(tier)}
                            variant={tier.popular ? 'default' : 'outline'}
                        >
                            Choose {tier.name}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}