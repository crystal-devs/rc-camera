import { SectionCard } from '@/components/layout/section-card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import React from 'react'
import { useRouter } from 'next/navigation'


interface IUserStat {
    totalEvents: number;
    totalPhotos: number;
    totalVideos: number;
    totalHostedEvents: number;
    totalAttendingEvents: number;
}
export const EventStats = ({userStat}: {userStat: IUserStat}) => {
    const router = useRouter();
    return (
        <SectionCard title="My Events" icon={<Calendar className="h-5 w-5" />}>
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start" onClick={() => router.push('/events?filter=hosting')}>
                    <span className="mr-auto">Hosting</span>
                    <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">{userStat.totalHostedEvents}</span>
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => router.push('/events?filter=attending')}>
                    <span className="mr-auto">Attending</span>
                    <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">{userStat.totalAttendingEvents}</span>
                </Button>
            </div>
        </SectionCard>
    )
}
