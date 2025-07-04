// Slim Sticky Header Component for Albums
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ShareIcon, MoreHorizontalIcon } from 'lucide-react';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { AlbumQR } from '@/components/album/AlbumQR';

interface AlbumHeaderProps {
    album: {
        id: string;
        name: string;
        accessCode?: string;
        createdById: number;
        eventId: string;
    };
    photoCount: number;
    isOwner: boolean;
}

export default function AlbumHeader({ album, photoCount, isOwner }: AlbumHeaderProps) {
    const router = useRouter();
    const [qrDialogOpen, setQrDialogOpen] = useState(false);

    const copyShareLink = () => {
        const shareUrl = `${window.location.origin}/join/${album.accessCode || album.id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
    };
    
    const handleDeleteAlbum = async () => {
        if (confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
            try {
                // In a real app, you'd delete all related data too
                await db.albums.delete(album.id);
                router.push(`/events/${album.eventId}`);
                toast.success("The album has been permanently removed.");
            } catch (error) {
                console.error('Error deleting album:', error);
                toast.error("Failed to delete the album");
            }
        }
    };

    return (
        <>
            <div className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md shadow-sm">
                {/* Desktop Header */}
                <div className="hidden sm:flex items-center justify-between px-4 py-3">
                    <div className="flex items-center">
                        {/* No back button on desktop */}
                        <h1 className="text-lg font-semibold truncate max-w-[300px] md:max-w-[400px]">{album.name}</h1>
                    </div>
                    
                    {/* Right side actions - desktop */}
                    <div className="flex gap-2">
                        {/* Share Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => setQrDialogOpen(true)}
                        >
                            <ShareIcon className="h-4 w-4" />
                        </Button>
                        
                        {/* More Options Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-full"
                                >
                                    <MoreHorizontalIcon className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {isOwner && (
                                    <DropdownMenuItem onClick={() => router.push(`/albums/${album.id}/edit`)}>
                                        Edit Album
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={copyShareLink}>
                                    Copy Share Link
                                </DropdownMenuItem>
                                {isOwner && (
                                    <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={handleDeleteAlbum}
                                    >
                                        Delete Album
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                
                {/* Mobile Header */}
                <div className="sm:hidden flex items-center justify-between px-2 py-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={() => router.back()}
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </Button>
                    
                    <h1 className="text-base font-semibold truncate max-w-[160px]">{album.name}</h1>
                    
                    {/* Right side actions - mobile */}
                    <div className="flex gap-1">                
                        {/* Share Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => setQrDialogOpen(true)}
                        >
                            <ShareIcon className="h-4 w-4" />
                        </Button>
                        
                        {/* More Options Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-full"
                                >
                                    <MoreHorizontalIcon className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {isOwner && (
                                    <DropdownMenuItem onClick={() => router.push(`/albums/${album.id}/edit`)}>
                                        Edit Album
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={copyShareLink}>
                                    Copy Share Link
                                </DropdownMenuItem>
                                {isOwner && (
                                    <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={handleDeleteAlbum}
                                    >
                                        Delete Album
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* QR Code Dialog */}
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Share Album</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-gray-500 mb-6">
                            Anyone with this QR code or link can view and add photos to this album.
                        </p>
                        <AlbumQR 
                            albumId={album.id} 
                            accessCode={album.accessCode || album.id} 
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
