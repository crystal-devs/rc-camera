'use client';

import React, { useState } from 'react';
import { ShopHero } from '@/components/shop/ShopHero';
import { ShopCategorySection } from '@/components/shop/ShopCategorySection';
import { Product } from '@/components/shop/ShopProductCard';
import { CustomMerchandiseCard, CustomMerchandiseProduct } from '@/components/shop/CustomMerchandiseCard';
import { DigitalDownloadCard, DigitalDownload } from '@/components/shop/DigitalDownloadCard';
import { SubscriptionTierCard, SubscriptionTier } from '@/components/shop/SubscriptionTierCard';
import { ShoppingCart, User, Shirt, Download, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

// Helper to build Unsplash image urls (direct image links with sizing params)
const unsplash = (id: string, w = 500) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

// Curated, stable Unsplash images (direct image resource paths)
// These are specific photo resources (not the random endpoint)
const WALL_ART_IMAGES = [
  unsplash('photo-1503387762-592deb58ef4e'), // minimal framed posters
  unsplash('photo-1504208434309-cb69f4fe52b0'), // gallery wall
  unsplash('photo-1494438639946-1ebd1d20bf85'), // clean wall frame
  unsplash('photo-1501876725168-00c445821c9e'), // minimalist interior print
  unsplash('photo-1524758631624-e2822e304c36'), // living room frames
  unsplash('photo-1505691938895-1758d7feb511'), // wood frame
  unsplash('photo-1501862700954-18382cd41497'), // interior wall art
  unsplash('photo-1519710164239-da123dc03ef4'), // Scandinavian interior
];

const PRINTS_IMAGES = [
  unsplash('photo-1499951360447-b19be8fe80f5'), // stack of photo prints
  unsplash('photo-1529333166437-7750a6dd5a70'), // minimal greeting-style prints
  unsplash('photo-1526170375885-4d8ecf77b99f'), // printed landscape photos
  unsplash('photo-1530092285049-1c42085fd395'), // clean product shot of prints
];

const DIGITAL_IMAGES = [
  unsplash('photo-1517816743773-6e0fd518b4a6'), // editing workspace
  unsplash('photo-1487014679447-9f8336841d58'), // clean desk + MacBook
  unsplash('photo-1515378791036-0648a3ef77b2'), // minimal device setup
  unsplash('photo-1503602642458-232111445657'), // digital workstation
];

const CARDS_IMAGES = [
  unsplash('photo-1515879218367-8466d910aaa4'), // card on table
  unsplash('photo-1487017159836-4e23ece2e4cf'), // minimal greeting card
  unsplash('photo-1484820540004-14229fe36ca3'), // stationery flat lay
  unsplash('photo-1600180758890-738a1b5ced44'), // wedding-style card
];

const ALBUMS_IMAGES = [
  unsplash('photo-1529333166437-7750a6dd5a70'), // wedding album styled
  unsplash('photo-1529232356377-57971f27014c'), // photobook flat lay
  unsplash('photo-1503602642458-232111445657'), // clean studio desk album
  unsplash('photo-1500917293891-ef795e70e1f6'), // books + lifestyle setup
];

// Sample data for new features
const sampleMerchandiseProducts: CustomMerchandiseProduct[] = [
  {
    id: '1',
    title: 'Custom Photo T-Shirt',
    description: 'Premium cotton t-shirt with your event photos printed in high quality',
    basePrice: 24.99,
    imageUrl: unsplash('photo-1521572163474-6864f9cf17ab'),
    category: 't-shirts',
    variants: {
      size: ['S', 'M', 'L', 'XL', 'XXL'],
      color: ['White', 'Black', 'Navy', 'Gray'],
      style: ['Crew Neck', 'V-Neck']
    },
    rating: 4.8,
    reviewCount: 156,
    isCustomizable: true,
    printfulId: 'pf-123'
  },
  {
    id: '2',
    title: 'Photo Coffee Mug',
    description: 'Ceramic mug with your favorite event moments',
    basePrice: 14.99,
    imageUrl: unsplash('photo-1514228742587-6b1558fcf93a'),
    category: 'mugs',
    variants: {
      size: ['11oz', '15oz'],
      color: ['White', 'Black']
    },
    rating: 4.6,
    reviewCount: 89,
    isCustomizable: true
  }
];

const sampleDigitalDownloads: DigitalDownload[] = [
  {
    id: '1',
    photoId: 'photo-123',
    title: 'Wedding Ceremony - High Resolution',
    thumbnailUrl: unsplash('photo-1606216794074-735e91aa2c92'),
    originalUrl: '#',
    format: 'jpg',
    size: 'original',
    fileSize: 5242880, // 5MB
    dimensions: { width: 3000, height: 2000 },
    price: 9.99,
    watermark: false,
    downloadCount: 0,
    maxDownloads: 5,
    isPurchased: false
  },
  {
    id: '2',
    photoId: 'photo-456',
    title: 'Reception Dance - Medium Quality',
    thumbnailUrl: unsplash('photo-1519741497674-611481863552'),
    originalUrl: '#',
    format: 'jpg',
    size: 'large',
    fileSize: 2097152, // 2MB
    dimensions: { width: 1920, height: 1280 },
    price: 4.99,
    watermark: true,
    downloadCount: 2,
    maxDownloads: 10,
    isPurchased: true
  }
];

const sampleSubscriptionTiers: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for small gatherings',
    price: 0,
    interval: 'month',
    features: [
      '5GB Storage',
      '1 Event',
      '25 Guests per event',
      'Basic photo sharing',
      'Community support'
    ],
    limits: {
      storage: 5,
      events: 1,
      guests: 25,
      downloads: 10
    },
    icon: 'star'
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing event organizers',
    price: 19,
    interval: 'month',
    features: [
      '50GB Storage',
      '10 Events',
      '150 Guests per event',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'Bulk downloads'
    ],
    limits: {
      storage: 50,
      events: 10,
      guests: 150,
      downloads: 100
    },
    popular: true,
    icon: 'zap'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large-scale event production',
    price: 49,
    interval: 'month',
    features: [
      'Unlimited Storage',
      'Unlimited Events',
      'Unlimited Guests',
      'White-label solution',
      'API access',
      'Dedicated support',
      'Advanced integrations'
    ],
    limits: {
      storage: -1,
      events: -1,
      guests: -1,
      downloads: -1
    },
    icon: 'crown'
  }
];

// Dummy Data Generation using stable images
const generateProducts = (category: string, images: string[], count: number): Product[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${category}-${i}`,
    title: `${category.replace(/(^|\s)\S/g, (t) => t.toUpperCase())} Item ${i + 1}`,
    price: Math.floor(Math.random() * 120) + 15,
    imageUrl: images[i % images.length],
    type: 'physical',
  }));
};

const CATEGORIES = [
  {
    id: 'wall-art',
    label: 'Wall Art',
    products: [
      { id: '1', title: 'Canvas', price: 86.0, imageUrl: WALL_ART_IMAGES[0], type: 'physical' },
      { id: '2', title: 'Metal Print', price: 37.0, imageUrl: WALL_ART_IMAGES[1], type: 'physical' },
      { id: '3', title: 'Standout Print', price: 43.0, imageUrl: WALL_ART_IMAGES[2], type: 'physical' },
      { id: '4', title: 'Gallery Frame', price: 58.0, imageUrl: WALL_ART_IMAGES[3], type: 'physical' },
      { id: '5', title: 'Metal Frame', price: 75.0, imageUrl: WALL_ART_IMAGES[4], type: 'physical' },
      { id: '6', title: 'Framed Canvas', price: 105.0, imageUrl: WALL_ART_IMAGES[5], type: 'physical' },
      { id: '7', title: 'Wood Frame', price: 65.0, imageUrl: WALL_ART_IMAGES[6], type: 'physical' },
      { id: '8', title: 'Bamboo Panel', price: 90.0, imageUrl: WALL_ART_IMAGES[7], type: 'physical' },
    ],
  },
  {
    id: 'prints',
    label: 'Prints',
    products: generateProducts('prints', PRINTS_IMAGES, 4),
  },
  {
    id: 'digital',
    label: 'Digital',
    products: generateProducts('digital', DIGITAL_IMAGES, 4),
  },
  {
    id: 'cards',
    label: 'Cards',
    products: generateProducts('cards', CARDS_IMAGES, 4),
  },
  {
    id: 'albums-books',
    label: 'Albums & Books',
    products: generateProducts('albums & books', ALBUMS_IMAGES, 4),
  },
] as const;

export default function ShopPage() {
  return (
    <div className="min-h-screen font-sans">
      {/* Header Navigation for Shop - Simplified as per screenshot */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex flex-col">
            <Link href="/shop" className="text-sm font-bold tracking-widest uppercase">Print Shop</Link>
            <span className="text-[10px] text-gray-500 tracking-wide uppercase">Rose Click Gallery</span>
          </div>

          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6 mr-6">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`#${cat.id}`}
                  className="text-xs font-medium tracking-wide text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white uppercase transition-colors"
                >
                  {cat.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="text-gray-600">
                <ShoppingCart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-600">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <ShopHero />

        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="prints" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="prints" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Prints
              </TabsTrigger>
              <TabsTrigger value="merchandise" className="flex items-center gap-2">
                <Shirt className="h-4 w-4" />
                Merchandise
              </TabsTrigger>
              <TabsTrigger value="downloads" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Downloads
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Plans
              </TabsTrigger>
              <TabsTrigger value="affiliate" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Affiliate
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prints">
              <div className="flex flex-col space-y-0 pb-20">
                {CATEGORIES.map((category) => (
                  <ShopCategorySection
                    key={category.id}
                    id={category.id}
                    title={category.label}
                    products={category.products as Product[]}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="merchandise">
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Custom Merchandise</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Turn your event photos into personalized merchandise. High-quality printing with fast delivery worldwide.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleMerchandiseProducts.map((product) => (
                    <CustomMerchandiseCard
                      key={product.id}
                      product={product}
                      onAddToCart={(product) => console.log('Add to cart:', product)}
                      onCustomize={(product) => console.log('Customize:', product)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="downloads">
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Digital Downloads</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Download high-resolution versions of your event photos. Perfect for printing, sharing, or archiving.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleDigitalDownloads.map((download) => (
                    <DigitalDownloadCard
                      key={download.id}
                      download={download}
                      onPurchase={(download) => console.log('Purchase:', download)}
                      onDownload={(download) => console.log('Download:', download)}
                      onPreview={(download) => console.log('Preview:', download)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="subscriptions">
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Unlock premium features and grow your event photography business with our flexible subscription plans.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {sampleSubscriptionTiers.map((tier) => (
                    <SubscriptionTierCard
                      key={tier.id}
                      tier={tier}
                      onSelect={(tier) => console.log('Select tier:', tier)}
                      onUpgrade={(tier) => console.log('Upgrade to:', tier)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="affiliate">
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Affiliate Program</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Earn commissions by referring photographers and event organizers to Rose Click. Share your unique referral link and start earning today.
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg p-8 text-center">
                    <h3 className="text-2xl font-bold mb-4">Earn 20% Commission</h3>
                    <p className="text-gray-600 mb-6">
                      Get paid for every successful referral. Higher tiers earn more!
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
                      <p className="text-sm text-gray-600 mb-2">Your Referral Link</p>
                      <code className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-sm break-all">
                        https://roseclick.com/ref/your-code
                      </code>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Copy Referral Link
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-2">$0</div>
                      <div className="text-sm text-gray-600">This Month</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                      <div className="text-2xl font-bold text-green-600 mb-2">0</div>
                      <div className="text-sm text-gray-600">Referrals</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-2">$0</div>
                      <div className="text-sm text-gray-600">Total Earned</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
