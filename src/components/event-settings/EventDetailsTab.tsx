// components/EventDetailsTab.tsx
import React from 'react';
import { isBefore, format } from 'date-fns';
import { CalendarIcon, Camera, Upload, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { EventFormData, EventTemplate } from '@/types/events';
import { EVENT_TEMPLATES } from '@/constants/constants';


interface EventDetailsTabProps {
    formData: EventFormData;
    onInputChange: (field: string, value: any) => void;
    previewUrl: string | null;
    onCoverImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearImage: () => void;
}

export const EventDetailsTab: React.FC<EventDetailsTabProps> = ({
    formData,
    onInputChange,
    previewUrl,
    onCoverImageChange,
    onClearImage
}) => {
    const handleDateChange = (field: "start_date" | "end_date", date: Date | undefined) => {
        if (!date) return;

        const isoDate = date.toISOString();

        if (field === "start_date") {
            onInputChange("start_date", isoDate);

            // If end date is not set or now before new start date, update it to match
            if (!formData.end_date || isBefore(new Date(formData.end_date), date)) {
                onInputChange("end_date", isoDate);
            }
        }

        if (field === "end_date") {
            onInputChange("end_date", isoDate);
        }
    };

    return (
        <>
            <Card className="border-0 shadow-sm" >
                <CardHeader className="pb-4" >
                    <CardTitle className="text-lg font-medium" > Basic Information </CardTitle>
                </CardHeader>
                < CardContent className="space-y-4" >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" >
                        <div className="space-y-2" >
                            <Label htmlFor="title" className="text-sm text-muted-foreground font-medium" >
                                Event name *
                            </Label>
                            < Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => onInputChange('title', e.target.value)}
                                placeholder="Sarah's Birthday Party"
                                className="h-10"
                                maxLength={100}
                            />
                        </div>
                        < div className="space-y-2" >
                            <Label htmlFor="template" className="text-sm font-medium text-muted-foreground" >
                                Event type
                            </Label>
                            < Select value={formData.template} onValueChange={(value) => onInputChange('template', value)}>
                                <SelectTrigger className="w-full h-[40px]" >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {
                                        EVENT_TEMPLATES.map((template: EventTemplate) => (
                                            <SelectItem key={template.value} value={template.value}>
                                                {template.label}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    < div className="space-y-2" >
                        <Label htmlFor="description" className="text-sm font-medium text-muted-foreground" >
                            Description
                        </Label>
                        < Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => onInputChange('description', e.target.value)}
                            placeholder="Tell your guests what to expect..."
                            rows={3}
                            maxLength={500}
                            className="resize-none"
                        />
                    </div>

                    < div className="grid grid-cols-1 md:grid-cols-2 gap-4" >
                        <div className="space-y-2" >
                            <Label htmlFor="location_name" className="text-sm font-medium text-muted-foreground" >
                                Venue
                            </Label>
                            < Input
                                id="location_name"
                                value={formData.location.name}
                                onChange={(e) => onInputChange('location.name', e.target.value)}
                                placeholder="Central Park"
                                className="h-10"
                            />
                        </div>
                        < div className="space-y-2" >
                            <Label htmlFor="location_address" className="text-sm font-medium text-muted-foreground" >
                                Address
                            </Label>
                            < Input
                                id="location_address"
                                value={formData.location.address}
                                onChange={(e) => onInputChange('location.address', e.target.value)}
                                placeholder="New York, NY"
                                className="h-10"
                            />
                        </div>
                    </div>

                    < div className="grid grid-cols-1 md:grid-cols-2 gap-4" >
                        {/* Start Date Picker */}
                        < div className="space-y-2" >
                            <Label className="text-sm font-medium text-muted-foreground" > Start date </Label>
                            < Popover >
                                <PopoverTrigger asChild >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {
                                            formData.start_date ? (
                                                format(new Date(formData.start_date), "PPP")
                                            ) : (
                                                <span>Select start date</ span >
                                            )}
                                    </Button>
                                </PopoverTrigger>
                                < PopoverContent className="w-auto p-0" align="start" >
                                    <Calendar
                                        mode="single"
                                        selected={formData.start_date ? new Date(formData.start_date) : undefined}
                                        onSelect={(date) => handleDateChange("start_date", date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* End Date Picker */}
                        <div className="space-y-2" >
                            <Label className="text-sm font-medium text-muted-foreground" > End date </Label>
                            < Popover >
                                <PopoverTrigger asChild >
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {
                                            formData.end_date ? (
                                                format(new Date(formData.end_date), "PPP")
                                            ) : (
                                                <span>Select end date</ span >
                                            )}
                                    </Button>
                                </PopoverTrigger>
                                < PopoverContent className="w-auto p-0" align="start" >
                                    <Calendar
                                        mode="single"
                                        selected={formData.end_date ? new Date(formData.end_date) : undefined}
                                        onSelect={(date) => handleDateChange("end_date", date)}
                                        disabled={(date) =>
                                            formData.start_date
                                                ? isBefore(date, new Date(formData.start_date))
                                                : false
                                        }
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cover Photo Card */}
            <Card className="border-0 shadow-sm" >
                <CardHeader className="pb-4" >
                    <CardTitle className="text-lg font-medium" > Cover Photo </CardTitle>
                </CardHeader>
                < CardContent >
                    <div className="space-y-4" >
                        {
                            previewUrl ? (
                                <div className="relative" >
                                    <img
                                        src={previewUrl}
                                        alt="Cover preview"
                                        className="w-full h-48 object-cover rounded-lg border"
                                    />
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                                        onClick={onClearImage}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50" >
                                    <Camera className="h-8 w-8 text-gray-400 mb-2" />
                                    <p className="text-sm font-medium text-gray-600" > Add a cover photo </p>
                                    < p className="text-xs text-gray-500" > Help guests recognize your event </p>
                                </div>
                            )}

                        <Input
                            id="cover_image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onCoverImageChange}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('cover_image')?.click()}
                            className="w-full"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {previewUrl ? 'Change Photo' : 'Upload Photo'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </>
    );
};