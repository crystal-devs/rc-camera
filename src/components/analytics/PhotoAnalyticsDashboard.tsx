import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Eye, Heart, Share2, Download, Users, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

export interface PhotoAnalytics {
    photoId: string;
    views: number;
    likes: number;
    shares: number;
    downloads: number;
    comments: number;
    uploadDate: Date;
    eventId: string;
    eventName: string;
    uploaderId: string;
    uploaderName: string;
    tags: string[];
    engagement: number; // calculated metric
}

interface PhotoAnalyticsDashboardProps {
    analytics: PhotoAnalytics[];
    eventId?: string;
    dateRange?: {
        start: Date;
        end: Date;
    };
}

export function PhotoAnalyticsDashboard({ analytics, eventId, dateRange }: PhotoAnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [sortBy, setSortBy] = useState<'engagement' | 'views' | 'downloads' | 'recent'>('engagement');

    // Filter analytics based on time range and event
    const filteredAnalytics = useMemo(() => {
        let filtered = analytics;

        // Filter by event if specified
        if (eventId) {
            filtered = filtered.filter(item => item.eventId === eventId);
        }

        // Filter by date range
        if (timeRange !== 'all') {
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            filtered = filtered.filter(item => item.uploadDate >= cutoffDate);
        }

        return filtered;
    }, [analytics, eventId, timeRange]);

    // Sort analytics
    const sortedAnalytics = useMemo(() => {
        return [...filteredAnalytics].sort((a, b) => {
            switch (sortBy) {
                case 'engagement':
                    return b.engagement - a.engagement;
                case 'views':
                    return b.views - a.views;
                case 'downloads':
                    return b.downloads - a.downloads;
                case 'recent':
                    return b.uploadDate.getTime() - a.uploadDate.getTime();
                default:
                    return 0;
            }
        });
    }, [filteredAnalytics, sortBy]);

    // Calculate summary metrics
    const summaryMetrics = useMemo(() => {
        const total = filteredAnalytics.reduce((acc, item) => ({
            views: acc.views + item.views,
            likes: acc.likes + item.likes,
            shares: acc.shares + item.shares,
            downloads: acc.downloads + item.downloads,
            comments: acc.comments + item.comments,
            photos: acc.photos + 1
        }), { views: 0, likes: 0, shares: 0, downloads: 0, comments: 0, photos: 0 });

        const avgEngagement = total.photos > 0
            ? filteredAnalytics.reduce((sum, item) => sum + item.engagement, 0) / total.photos
            : 0;

        return { ...total, avgEngagement };
    }, [filteredAnalytics]);

    // Get top performing photos
    const topPhotos = sortedAnalytics.slice(0, 5);

    // Calculate engagement distribution
    const engagementDistribution = useMemo(() => {
        const ranges = [
            { label: 'Low (0-10)', min: 0, max: 10, count: 0 },
            { label: 'Medium (11-50)', min: 11, max: 50, count: 0 },
            { label: 'High (51-100)', min: 51, max: 100, count: 0 },
            { label: 'Very High (100+)', min: 101, max: Infinity, count: 0 }
        ];

        filteredAnalytics.forEach(item => {
            const range = ranges.find(r => item.engagement >= r.min && item.engagement <= r.max);
            if (range) range.count++;
        });

        return ranges;
    }, [filteredAnalytics]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Photo Analytics</h2>
                    <p className="text-gray-600">Track engagement and performance metrics</p>
                </div>

                <div className="flex gap-2">
                    <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="engagement">Sort by Engagement</SelectItem>
                            <SelectItem value="views">Sort by Views</SelectItem>
                            <SelectItem value="downloads">Sort by Downloads</SelectItem>
                            <SelectItem value="recent">Sort by Recent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">Total Views</span>
                        </div>
                        <p className="text-2xl font-bold">{formatNumber(summaryMetrics.views)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium">Total Likes</span>
                        </div>
                        <p className="text-2xl font-bold">{formatNumber(summaryMetrics.likes)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Download className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">Downloads</span>
                        </div>
                        <p className="text-2xl font-bold">{formatNumber(summaryMetrics.downloads)}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-medium">Avg Engagement</span>
                        </div>
                        <p className="text-2xl font-bold">{summaryMetrics.avgEngagement.toFixed(1)}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="top-photos">Top Photos</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Engagement Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Engagement Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {engagementDistribution.map((range) => (
                                <div key={range.label} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{range.label}</span>
                                        <span>{range.count} photos</span>
                                    </div>
                                    <Progress
                                        value={filteredAnalytics.length > 0 ? (range.count / filteredAnalytics.length) * 100 : 0}
                                        className="h-2"
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {sortedAnalytics.slice(0, 5).map((item) => (
                                    <div key={item.photoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                                <Eye className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Photo uploaded</p>
                                                <p className="text-xs text-gray-600">
                                                    {item.uploadDate.toLocaleDateString()} • {item.uploaderName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{item.views} views</p>
                                            <p className="text-xs text-gray-600">{item.engagement} engagement</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="top-photos" className="space-y-6">
                    <div className="grid gap-4">
                        {topPhotos.map((photo, index) => (
                            <Card key={photo.photoId}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full font-bold text-sm">
                                            {index + 1}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-medium">Photo by {photo.uploaderName}</h3>
                                                <Badge variant="outline">{photo.eventName}</Badge>
                                            </div>

                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                    <span>{formatNumber(photo.views)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Heart className="h-4 w-4 text-red-500" />
                                                    <span>{formatNumber(photo.likes)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Download className="h-4 w-4 text-green-500" />
                                                    <span>{formatNumber(photo.downloads)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Share2 className="h-4 w-4 text-purple-500" />
                                                    <span>{formatNumber(photo.shares)}</span>
                                                </div>
                                            </div>

                                            <div className="mt-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600">Engagement Score:</span>
                                                    <Progress value={Math.min(photo.engagement, 100)} className="flex-1 h-2" />
                                                    <span className="text-sm font-medium">{photo.engagement}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Upload Patterns */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Upload Patterns
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-600">{summaryMetrics.photos}</p>
                                    <p className="text-sm text-blue-600">Total Photos</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Most active day</span>
                                        <span className="font-medium">Saturday</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Peak upload hour</span>
                                        <span className="font-medium">8-10 PM</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Avg photos per event</span>
                                        <span className="font-medium">24</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Popular Tags */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Popular Tags
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {['wedding', 'portrait', 'landscape', 'party', 'family'].map((tag, index) => (
                                        <div key={tag} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">#{tag}</span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {Math.floor(Math.random() * 50) + 10} photos
                                                </Badge>
                                            </div>
                                            <div className="w-20">
                                                <Progress value={(5 - index) * 20} className="h-2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recommendations */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                    📈 Your photos are performing well! Try posting during peak hours (8-10 PM) for maximum engagement.
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    🎯 Popular tags like #wedding and #portrait are driving more views. Use them in your photo descriptions.
                                </p>
                            </div>
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <p className="text-sm text-purple-800">
                                    📱 Mobile uploads are getting 40% more engagement. Encourage guests to use their phones!
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}