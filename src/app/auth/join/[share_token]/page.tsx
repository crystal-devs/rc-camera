// // src/app/auth/join/[share_token]/page.tsx
// import { redirect } from 'next/navigation';
// import { getEventByShareToken, checkUserInviteStatus } from '@/lib/api';
// import { getCurrentUser } from '@/lib/auth';

// interface ShareTokenPageProps {
//   params: {
//     share_token: string;
//   };
// }

// export default async function ShareTokenRouter({ params }: ShareTokenPageProps) {
//   const { share_token } = params;
  
//   try {
//     // Decode share token and get event details
//     const event = await getEventByShareToken(share_token);
    
//     if (!event) {
//       redirect('/event-not-found');
//     }

//     const currentUser = await getCurrentUser();
    
//     // Route based on event visibility
//     switch (event.visibility) {
//       case 'anyone_with_link':
//         // Direct access to guest interface
//         redirect(`/guest/${event._id}?token=${share_token}`);
//         break;
        
//       case 'invited_only':
//         if (!currentUser) {
//           // Redirect to login with return URL
//           redirect(`/login?redirect=/guest/${event._id}&token=${share_token}`);
//         }
        
//         // Check if user is invited
//         const isInvited = await checkUserInviteStatus(event._id, currentUser.id);
        
//         if (isInvited) {
//           redirect(`/guest/${event._id}?token=${share_token}`);
//         } else {
//           redirect(`/invite-required?event=${event._id}`);
//         }
//         break;
        
//       case 'private':
//         if (!currentUser) {
//           redirect(`/login?redirect=/auth/join/${share_token}`);
//         }
        
//         // Check if user is co-host
//         const isCoHost = event.co_hosts?.some(
//           (host: any) => host.user_id.toString() === currentUser.id && 
//           host.status === 'approved'
//         );
        
//         if (isCoHost || event.created_by.toString() === currentUser.id) {
//           redirect(`/event/${event._id}`);
//         } else {
//           redirect(`/private-access-denied?event=${event._id}`);
//         }
//         break;
        
//       default:
//         redirect('/event-not-found');
//     }
//   } catch (error) {
//     console.error('Error processing share token:', error);
//     redirect('/event-not-found');
//   }
// }