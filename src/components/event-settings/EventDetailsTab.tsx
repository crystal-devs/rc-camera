// components/EventDetailsTab.tsx
import React from 'react';
import { isBefore, format } from 'date-fns';
import { CalendarIcon, Camera, Upload, X, MapPin, FileText, Tag, Clock } from 'lucide-react';

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
        <div className="space-y-12">
            {/* Basic Information Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Basic Information
                    </h3>
                    <p className="text-sm text-gray-600">
                        Set up the essential details for your event. This information will be visible to all guests and helps them understand what to expect.
                    </p>
                </div>

                {/* Right Column - Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Event Name & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                                Event name *
                            </Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => onInputChange('title', e.target.value)}
                                placeholder="Sarah's Birthday Party"
                                className="h-11 shadow-none"
                                maxLength={100}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template" className="text-sm font-medium text-gray-700">
                                Event type
                            </Label>
                            <Select value={formData.template} onValueChange={(value) => onInputChange('template', value)}>
                                <SelectTrigger className="h-24 w-full shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EVENT_TEMPLATES.map((template: EventTemplate) => (
                                        <SelectItem key={template.value} value={template.value}>
                                            {template.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => onInputChange('description', e.target.value)}
                            placeholder="Tell your guests what to expect..."
                            rows={4}
                            maxLength={500}
                            className="resize-none shadow-none"
                        />
                        <p className="text-xs text-gray-500">
                            {formData.description.length}/500 characters
                        </p>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Location Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-green-600" />
                        Location Details
                    </h3>
                    <p className="text-sm text-gray-600">
                        Help your guests find the event location easily. Include both venue name and full address for clarity.
                    </p>
                </div>

                {/* Right Column - Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="location_name" className="text-sm font-medium text-gray-700">
                                Venue name
                            </Label>
                            <Input
                                id="location_name"
                                value={formData.location.name}
                                onChange={(e) => onInputChange('location.name', e.target.value)}
                                placeholder="Central Park"
                                className="h-11 shadow-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location_address" className="text-sm font-medium text-gray-700">
                                Full address
                            </Label>
                            <Input
                                id="location_address"
                                value={formData.location.address}
                                onChange={(e) => onInputChange('location.address', e.target.value)}
                                placeholder="New York, NY 10024"
                                className="h-11 shadow-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Date & Time Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        Date & Time
                    </h3>
                    <p className="text-sm text-gray-600">
                        Set when your event starts and ends. The end date cannot be earlier than the start date.
                    </p>
                </div>

                {/* Right Column - Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Date Picker */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Start date *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal h-11 shadow-none"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.start_date ? (
                                            format(new Date(formData.start_date), "PPP")
                                        ) : (
                                            <span className="text-gray-500">Select start date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
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
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">End date *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal h-11 shadow-none"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.end_date ? (
                                            format(new Date(formData.end_date), "PPP")
                                        ) : (
                                            <span className="text-gray-500">Select end date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
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
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Cover Photo Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Info */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Camera className="h-5 w-5 text-orange-600" />
                        Cover Photo
                    </h3>
                    <p className="text-sm text-gray-600">
                        Add a cover photo to make your event more attractive and help guests recognize it easily.
                    </p>
                </div>

                {/* Right Column - Photo Upload */}
                <div className="lg:col-span-2">
                    <div className="space-y-4">
                        {previewUrl ? (
                            <div className="relative group">
                                <img
                                    src={previewUrl}
                                    alt="Cover preview"
                                    className="w-full h-56 object-cover rounded-lg border-2 border-gray-200"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="absolute top-3 right-3 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={onClearImage}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <Camera className="h-12 w-12 text-gray-400 mb-3" />
                                <p className="text-base font-medium text-gray-600">Add a cover photo</p>
                                <p className="text-sm text-gray-500 mt-1">Help guests recognize your event</p>
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
                            className="w-full h-11"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {previewUrl ? 'Change Photo' : 'Upload Photo'}
                        </Button>

                        {previewUrl && (
                            <p className="text-xs text-gray-500 text-center">
                                Recommended: 1200x600px, max 5MB (JPG, PNG)
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )

};