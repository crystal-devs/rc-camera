'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Zod schema for form validation
const formSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
    description: z.string().min(1, 'Description is required').max(1000, 'Description must be 1000 characters or less'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).refine(
        (val) => val !== undefined,
        { message: 'Please select a severity level' }
    ),
    file: z
        .instanceof(File)
        .optional()
        .refine((file) => !file || file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
        .refine(
            (file) => !file || ['image/png', 'image/jpeg', 'application/pdf'].includes(file.type),
            'File must be PNG, JPEG, or PDF',
        ),
});

type FormData = z.infer<typeof formSchema>;

export default function BugReport() {
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isPending, startTransition] = useTransition();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            severity: undefined,
            file: undefined,
            // user_id: 
        },
    });

    const handleSubmit = async (data: FormData) => {
        startTransition(async () => {
            setSubmitStatus('idle');
            try {
                // Simulate API call
                await new Promise((resolve) => setTimeout(resolve, 1000));
                setSubmitStatus('success');
                form.reset();
            } catch (error) {
                setSubmitStatus('error');
            }
        });
    };

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Report a Bug</CardTitle>
                    <CardDescription>
                        Help us improve by reporting any issues you encounter.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bug Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter a brief title for the bug" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Describe the bug in detail" rows={5} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="severity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Severity</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select severity level" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="file"
                                render={({ field: { onChange, value, ...field } }) => (
                                    <FormItem>
                                        <FormLabel>Attachment (optional)</FormLabel>
                                        <div className="flex items-center space-x-2">
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="image/png,image/jpeg"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        onChange(file);
                                                    }}
                                                    className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <Upload className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" disabled={isPending} className="w-full">
                                {isPending ? 'Submitting...' : 'Submit Bug Report'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}