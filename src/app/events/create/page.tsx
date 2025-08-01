'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createEvent } from '@/services/apis/events.api';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/layout/date-picker';
import { Event } from '@/types/backend-types/event.type';

type TEvent = {
  title: string;
  template: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
  start_date?: Date;
  end_date?: Date;
};

const eventFormSchema = z.object({
  title: z.string().min(1, "Event name is required"),
  template: z.enum(['wedding', 'birthday', 'concert', 'corporate', 'vacation', 'custom']),
  start_date: z.date(),
  end_date: z.date().optional(),
})

const SimpleEventCreateForm = () => {
  const router = useRouter();

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      template: 'custom',
      start_date: new Date(),
      end_date: undefined,
    },
  })

  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

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
    form.setValue('start_date', today);
  }, [router]);

  const eventTemplates = [
    { value: 'wedding', label: 'Wedding' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'concert', label: 'Concert' },
    { value: 'corporate', label: 'Corporate Event' },
    { value: 'vacation', label: 'Vacation' },
    { value: 'custom', label: 'Other' },
  ];

  const handleSubmit = async (data: TEvent) => {
    setIsSubmitting(true);

    console.log("data on submit", data)

    try {
      const submitData: Partial<Event> = {
        title: data.title.trim(),
        template: data.template,
        start_date: data.start_date ? new Date(data.start_date)  : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
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
    <div className=" flex items-center justify-center md:p-4">
      <div className="w-full ">
        

        <div className="rounded-lg w-full  md:shadow-sm md:border md:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Wedding" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3 w-full">
                <FormField
                  control={form.control}
                  name="template"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-3 w-full">
                <div>
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            setDate={(newDate) => {
                              field.onChange(newDate);
                              setStartDate(newDate);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>End Date (optional)</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            setDate={(newDate) => {
                              field.onChange(newDate);
                              setEndDate(newDate);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full mt-6">
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          You can customize settings after creating the event
        </p>
      </div>
    </div>
  );
};

export default SimpleEventCreateForm;
