import Image from 'next/image';
import { Download, Eye, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface DigitalDownload {
    id: string;
    photoId: string;
    title: string;
    thumbnailUrl: string;
    originalUrl: string;
    format: 'jpg' | 'png' | 'tiff';
    size: 'small' | 'medium' | 'large' | 'original';
    fileSize: number; // in bytes
    dimensions: {
        width: number;
        height: number;
    };
    price: number;
    watermark: boolean;
    downloadCount: number;
    maxDownloads: number;
    expiresAt?: Date;
    isPurchased: boolean;
    downloadUrl?: string;
}

interface DigitalDownloadCardProps {
    download: DigitalDownload;
    onPurchase: (download: DigitalDownload) => void;
    onDownload: (download: DigitalDownload) => void;
    onPreview: (download: DigitalDownload) => void;
}

export function DigitalDownloadCard({ download, onPurchase, onDownload, onPreview }: DigitalDownloadCardProps) {
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getDownloadProgress = () => {
        return (download.downloadCount / download.maxDownloads) * 100;
    };

    return (
        <Card className="group relative overflow-hidden">
            <CardHeader className="p-0">
                <div className="relative aspect-square overflow-hidden">
                    <Image
                        src={download.thumbnailUrl}
                        alt={download.title}
                        fill
                        className="object-cover"
                    />

                    {/* Watermark indicator */}
                    {download.watermark && (
                        <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="text-xs bg-black/70 text-white">
                                <Lock className="h-3 w-3 mr-1" />
                                Watermarked
                            </Badge>
                        </div>
                    )}

                    {/* Format badge */}
                    <div className="absolute top-2 right-2">
                        <Badge variant="outline" className="text-xs bg-white/90">
                            {download.format.toUpperCase()}
                        </Badge>
                    </div>

                    {/* Purchased indicator */}
                    {download.isPurchased && (
                        <div className="absolute bottom-2 right-2">
                            <Badge className="text-xs bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Purchased
                            </Badge>
                        </div>
                    )}

                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onPreview(download)}
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                            </Button>

                            {download.isPurchased ? (
                                <Button
                                    size="sm"
                                    onClick={() => onDownload(download)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => onPurchase(download)}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    ${download.price.toFixed(2)}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
                <div>
                    <h3 className="font-semibold text-sm line-clamp-2">{download.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                        {download.dimensions.width} × {download.dimensions.height}px
                    </p>
                </div>

                {/* Download progress for purchased items */}
                {download.isPurchased && download.maxDownloads > 1 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                            <span>Downloads used</span>
                            <span>{download.downloadCount}/{download.maxDownloads}</span>
                        </div>
                        <Progress value={getDownloadProgress()} className="h-1" />
                    </div>
                )}

                {/* File info */}
                <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>{download.size}</span>
                    <span>{formatFileSize(download.fileSize)}</span>
                </div>

                {/* Price or status */}
                <div className="flex justify-between items-center">
                    {download.isPurchased ? (
                        <Badge variant="outline" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Owned
                        </Badge>
                    ) : (
                        <span className="font-semibold">${download.price.toFixed(2)}</span>
                    )}

                    {/* Expiry warning */}
                    {download.expiresAt && (
                        <Badge variant="destructive" className="text-xs">
                            Expires soon
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}