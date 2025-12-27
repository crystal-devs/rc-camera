import { redirect } from 'next/navigation';

interface ShareTokenPageProps {
    params: Promise<{
        share_token: string;
    }>;
}

export default async function ShareTokenRouter({ params }: ShareTokenPageProps) {
    // Temporarily redirect to not found until this route is implemented
    redirect('/event-not-found');
}