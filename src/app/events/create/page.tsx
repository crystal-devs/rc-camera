'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createEvent } from '@/services/apis/events.api';
import { useRouter } from 'next/navigation';

type SimpleEventData = {
  title: string;
  template: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
  start_date?: string;
  end_date?: string;
};

const SimpleEventCreateForm = () => {
  const router = useRouter();

  const [formData, setFormData] = useState<SimpleEventData>({
    title: '',
    template: 'custom',
    start_date: '',
    end_date: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setAuthToken(storedToken);
    } else {
      toast.error('You need to be logged in to create an event');
      router.push('/events');
    }

    // Set default start date to today
    const today = new Date();
    setFormData((prev) => ({
      ...prev,
      start_date: today.toISOString().slice(0, 16),
    }));
  }, [router]);

  const eventTemplates = [
    { value: 'wedding', label: 'Wedding' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'concert', label: 'Concert' },
    { value: 'corporate', label: 'Corporate Event' },
    { value: 'vacation', label: 'Vacation' },
    { value: 'custom', label: 'Other' },
  ];

  const handleInputChange = (field: keyof SimpleEventData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push('Event name is required');
    if (!formData.template) errors.push('Please select event type');
    if (!formData.start_date) errors.push('Start date is required');

    const startDate = new Date(formData.start_date);
    const endDate = formData.end_date ? new Date(formData.end_date) : null;
    if (endDate && startDate >= endDate) {
      errors.push('End date must be after start date');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData: SimpleEventData = {
        title: formData.title.trim(),
        template: formData.template,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
      };

      const createdEvent = await createEvent(submitData, authToken!);

      toast.success('Event created successfully!');
      router.push(`/events/${createdEvent._id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-100 mb-2">Create Event</h1>
          <p className="text-gray-600 text-sm">Share photos with your guests</p>
        </div>

        <div className="rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">Event Name</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="My Wedding"
                className="mt-1"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="template" className="text-sm font-medium">Event Type</Label>
              <Select
                value={formData.template}
                onValueChange={(value) => handleInputChange('template', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTemplates.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start_date" className="text-sm font-medium">Start Date</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_date" className="text-sm font-medium">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full mt-6">
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          You can customize settings after creating the event
        </p>
      </div>
    </div>
  );
};

export default SimpleEventCreateForm;
