import { EventFormData, EventTemplate } from "@/types/events";

export const EVENT_TEMPLATES: EventTemplate[] = [
  { value: 'wedding', label: '💒 Wedding', desc: 'Perfect for wedding ceremonies and receptions' },
  { value: 'birthday', label: '🎂 Birthday', desc: 'Celebrate special birthdays and milestones' },
  { value: 'vacation', label: '🏖️ Vacation', desc: 'Share memories from your travels' },
  { value: 'corporate', label: '🏢 Corporate', desc: 'Team events and company gatherings' },
  { value: 'concert', label: '🎵 Concert', desc: 'Music events and performances' },
  { value: 'custom', label: '✨ Other', desc: 'Any other special occasion' }
];

export const INITIAL_FORM_DATA: EventFormData = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  location: { name: '', address: '' },
  template: 'custom',
  cover_image: { url: '', public_id: '' },
  visibility: 'private',
  permissions: {
    can_view: true,
    can_upload: true,
    can_download: true,
    allowed_media_types: {
      images: true,
      videos: true
    },
    require_approval: false
  },
  share_settings: {
    is_active: true,
    password: null,
    expires_at: null
  },
  share_token: '',
  co_host_invite_token: {
    token: '',
    expires_at: '',
    is_active: true
  }
};