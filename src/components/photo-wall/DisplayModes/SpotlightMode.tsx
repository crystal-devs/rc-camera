// // components/PhotoWall/DisplayModes/SpotlightMode.tsx
// 'use client';

// import React from 'react';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Star, Clock, User, ChevronRight } from 'lucide-react';
// import { Photo, PhotoWallSettings } from '../photoWall.types';

// interface SpotlightModeProps {
//   photos: Photo[];
//   settings: PhotoWallSettings;
//   currentPhoto: Photo;
//   onNext: () => void;
//   onPhotoFeature?: (photo: Photo) => void;
// }

// export const SpotlightMode: React.FC<SpotlightModeProps> = ({ 
//   photos, 
//   settings, 
//   currentPhoto,
//   onNext,
//   onPhotoFeature 
// }) => {
//   const thumbnails = photos.slice(0, 8); // Show 8 thumbnails

//   return (
//     <div className="h-full flex">
//       {/* Main Photo Area */}
//       <div className="flex-1 relative flex items-center justify-center bg-black/20 p-8">
//         <div className="relative max-w-4xl max-h-full">
//           <img 
//             src={currentPhoto.url}
//             alt={currentPhoto.caption || 'Event photo'}
//             className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
//           />

//           {/* Photo Badges */}
//           <div className="absolute top-4 left-4 flex gap-2">
//             {currentPhoto.priority === 'instant' && (
//               <Badge className="bg-green-500">New</Badge>
//             )}
//             {currentPhoto.featured && (
//               <Badge className="bg-yellow-500">
//                 <Star className="w-3 h-3 mr-1" />
//                 Featured
//               </Badge>
//             )}
//           </div>

//           {/* Feature Button for Admin */}
//           {onPhotoFeature && (
//             <Button 
//               className="absolute top-4 right-4 bg-yellow-500 hover:bg-yellow-600"
//               size="sm"
//               onClick={() => onPhotoFeature(currentPhoto)}
//             >
//               <Star className="w-4 h-4 mr-1" />
//               Feature
//             </Button>
//           )}
//         </div>

//         {/* Photo Info */}
//         {(settings.showCaptions || settings.showUploaderNames) && (
//           <div className="absolute bottom-8 left-8 right-8 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
//             {settings.showUploaderNames && currentPhoto.uploaderName && (
//               <div className="flex items-center font-medium mb-2">
//                 <User className="w-4 h-4 mr-2" />
//                 {currentPhoto.uploaderName}
//               </div>
//             )}
//             {settings.showCaptions && currentPhoto.caption && (
//               <p className="text-lg">{currentPhoto.caption}</p>
//             )}
//             <div className="flex items-center text-sm text-white/80 mt-2">
//               <Clock className="w-3 h-3 mr-1" />
//               {new Date(currentPhoto.timestamp).toLocaleString()}
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Thumbnail Sidebar */}
//       <div className="w-80 bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-white font-medium">Recent Photos</h3>
//           <Button 
//             variant="ghost" 
//             size="sm" 
//             onClick={onNext}
//             className="text-white hover:bg-white/20"
//           >
//             <ChevronRight className="w-4 h-4" />
//           </Button>
//         </div>

//         <div className="space-y-3">
//           {thumbnails.map((photo, index) => (
//             <div 
//               key={photo.id}
//               className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
//                 photo.id === currentPhoto.id 
//                   ? 'border-white shadow-lg' 
//                   : 'border-white/20 hover:border-white/40'
//               }`}
//               onClick={onNext}
//             >
//               <div className="aspect-[4/3] relative">
//                 <img 
//                   src={photo.thumbnail}
//                   alt={photo.caption || 'Event photo'}
//                   className="w-full h-full object-cover"
//                 />
                
//                 {/* Priority badges */}
//                 {photo.priority === 'instant' && (
//                   <Badge className="absolute top-1 left-1 text-xs bg-green-500">
//                     New
//                   </Badge>
//                 )}
//                 {photo.featured && (
//                   <Badge className="absolute top-1 right-1 text-xs bg-yellow-500">
//                     <Star className="w-2 h-2" />
//                   </Badge>
//                 )}

//                 {/* Hover overlay */}
//                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
//               </div>

//               {/* Photo info */}
//               <div className="p-2 bg-black/50">
//                 {settings.showUploaderNames && photo.uploaderName && (
//                   <p className="text-white text-xs font-medium truncate">
//                     {photo.uploaderName}
//                   </p>
//                 )}
//                 {settings.showCaptions && photo.caption && (
//                   <p className="text-white/80 text-xs truncate">
//                     {photo.caption}
//                   </p>
//                 )}
//                 <p className="text-white/60 text-xs">
//                   {new Date(photo.timestamp).toLocaleTimeString()}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Queue Status */}
//         <div className="mt-6 p-3 bg-white/10 rounded-lg">
//           <p className="text-white text-sm font-medium mb-2">Queue Status</p>
//           <div className="space-y-1 text-xs text-white/80">
//             <div>Total: {photos.length} photos</div>
//             <div>New uploads in queue</div>
//             <div>Auto-advancing every {settings.displayDuration / 1000}s</div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
