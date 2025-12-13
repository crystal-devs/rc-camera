import { Button } from '@/components/ui/button';
import { LockIcon, HomeIcon } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function AccessDeniedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-lg">
                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <LockIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        Access Denied
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        You do not have permission to view this event. It may be private or restricted to invited guests only.
                    </p>
                </div>

                <div className="pt-4">
                    <Button asChild className="w-full" size="lg">
                        <Link href="/events">
                            <HomeIcon className="mr-2 h-4 w-4" />
                            Go to My Events
                        </Link>
                    </Button>
                </div>
            </Card>
        </div>
    );
}
