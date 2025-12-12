'use client';

import React from 'react';
import { ShopHero } from '@/components/shop/ShopHero';
import { ShopCategorySection } from '@/components/shop/ShopCategorySection';
import { Product } from '@/components/shop/ShopProductCard';
import { ShoppingCart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans">
      {/* Header Navigation for Shop - Simplified as per screenshot */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
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
      </main>
    </div>
  );
}
