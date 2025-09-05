import React from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, Share } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'

export const Actions = () => {
    const router = useRouter();
    return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-end mt-4">
      {/* <Button variant="outline" onClick={() => router.push('/profile/share')}>
        <Share className="mr-2 h-4 w-4" />
        Share Profile
      </Button> */}
      <Button variant="destructive" onClick={() => {
        const { logout } = useStore.getState();
        logout();
        toast.success('Logged out successfully');
        router.push('/login');
      }}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>
  )
}
