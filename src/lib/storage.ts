import Dexie, { Table } from 'dexie';

// Define the Dexie database
class CameraDB extends Dexie {
  images!: Table<{ id?: number; data: string }>;

  constructor() {
    super('CameraAppDB');
    this.version(1).stores({
      images: '++id', // Auto-incrementing ID
    });
  }
}

const db = new CameraDB();

export async function saveImage(imageData: string): Promise<number> {
  return await db.images.add({ data: imageData });
}

export async function getImages(): Promise<string[]> {
  const images = await db.images.toArray();
  return images.map((img) => img.data);
}