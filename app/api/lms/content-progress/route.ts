import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db/mongodb';
import UserVideoProgress from '@/models/lms/UserVideoProgress';
import UserPDFProgress from '@/models/lms/UserPDFProgress';
import mongoose from 'mongoose';

/**
 * Content Progress API
 * Handles saving and retrieving video/PDF progress for lessons
 */

// GET - Fetch progress for a lesson
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const searchParams = request.nextUrl.searchParams;
        const lessonId = searchParams.get('lessonId');
        const personId = searchParams.get('personId');
        const materialId = searchParams.get('materialId');
        const type = searchParams.get('type'); // 'video' | 'pdf' | 'all'

        if (!lessonId || !personId) {
            return NextResponse.json({ error: 'lessonId and personId are required' }, { status: 400 });
        }

        const result: {
            videoProgress: any | null;
            pdfProgress: any | null;
        } = {
            videoProgress: null,
            pdfProgress: null
        };

        // Fetch video progress
        if (type === 'video' || type === 'all' || !type) {
            const videoQuery: any = {
                lessonId: new mongoose.Types.ObjectId(lessonId),
                personId: new mongoose.Types.ObjectId(personId)
            };

            const videoProgress = await UserVideoProgress.findOne(videoQuery).lean();

            if (videoProgress) {
                // If materialId is specified, find specific video progress
                if (materialId && videoProgress.watchedVideos) {
                    const specificVideo = videoProgress.watchedVideos.find((v: any) => v.materialId?.toString() === materialId);
                    result.videoProgress = specificVideo
                        ? {
                              ...videoProgress,
                              currentVideo: specificVideo
                          }
                        : videoProgress;
                } else {
                    result.videoProgress = videoProgress;
                }
            }
        }

        // Fetch PDF progress
        if (type === 'pdf' || type === 'all' || !type) {
            const pdfQuery: any = {
                lessonId: new mongoose.Types.ObjectId(lessonId),
                personId: new mongoose.Types.ObjectId(personId)
            };

            const pdfProgress = await UserPDFProgress.findOne(pdfQuery).lean();

            if (pdfProgress) {
                // If materialId is specified, find specific PDF progress
                if (materialId && pdfProgress.readPDFs) {
                    const specificPDF = pdfProgress.readPDFs.find((p: any) => p.materialId?.toString() === materialId);
                    result.pdfProgress = specificPDF
                        ? {
                              ...pdfProgress,
                              currentPDF: specificPDF
                          }
                        : pdfProgress;
                } else {
                    result.pdfProgress = pdfProgress;
                }
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching content progress:', error);
        return NextResponse.json({ error: 'Failed to fetch content progress' }, { status: 500 });
    }
}

// POST - Save progress for video or PDF
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { lessonId, personId, schoolSiteId, type, materialId, progress } = body;

        if (!lessonId || !personId || !type || !progress) {
            return NextResponse.json({ error: 'lessonId, personId, type, and progress are required' }, { status: 400 });
        }

        if (type === 'video') {
            // Save video progress
            const {
                watchedDuration,
                totalDuration,
                watchPercentage,
                videoFileName, // For backwards compatibility
                contentUrl // Store URL when no materialId
            } = progress;

            // Find or create video progress record
            let videoProgressRecord = await UserVideoProgress.findOne({
                lessonId: new mongoose.Types.ObjectId(lessonId),
                personId: new mongoose.Types.ObjectId(personId)
            });

            if (!videoProgressRecord) {
                videoProgressRecord = new UserVideoProgress({
                    lessonId: new mongoose.Types.ObjectId(lessonId),
                    personId: new mongoose.Types.ObjectId(personId),
                    schoolSiteId: schoolSiteId ? new mongoose.Types.ObjectId(schoolSiteId) : new mongoose.Types.ObjectId(personId), // Fallback
                    watchedVideos: [],
                    totalWatchTime: 0
                });
            }

            // Find existing video entry by materialId or contentUrl
            const existingVideoIndex = videoProgressRecord.watchedVideos.findIndex((v: any) => (materialId ? v.materialId?.toString() === materialId : contentUrl ? v.contentUrl === contentUrl : v.contentUrl === videoFileName));

            const videoEntry = {
                materialId: materialId ? new mongoose.Types.ObjectId(materialId) : undefined,
                contentUrl: contentUrl || videoFileName, // Store URL for identification
                watchedDuration: watchedDuration || 0,
                totalDuration: totalDuration || 0,
                watchPercentage: watchPercentage || (totalDuration > 0 ? Math.round((watchedDuration / totalDuration) * 100) : 0),
                completedAt: watchPercentage >= 90 ? new Date() : undefined
            };

            if (existingVideoIndex >= 0) {
                // Update existing entry - keep highest watched duration
                const existing = videoProgressRecord.watchedVideos[existingVideoIndex];
                if (watchedDuration > (existing.watchedDuration || 0)) {
                    videoProgressRecord.watchedVideos[existingVideoIndex] = {
                        ...existing,
                        ...videoEntry
                    };
                }
            } else {
                videoProgressRecord.watchedVideos.push(videoEntry as any);
            }

            // Update total watch time
            videoProgressRecord.totalWatchTime = videoProgressRecord.watchedVideos.reduce((sum: number, v: any) => sum + (v.watchedDuration || 0), 0);
            videoProgressRecord.lastWatchedAt = new Date();

            await videoProgressRecord.save();

            return NextResponse.json({
                success: true,
                message: 'Video progress saved',
                progress: videoProgressRecord
            });
        } else if (type === 'pdf') {
            // Save PDF progress
            const {
                currentPageNumber,
                totalPages,
                pagesRead,
                readPercentage,
                pdfFileName, // For backwards compatibility
                contentUrl // Store URL when no materialId
            } = progress;

            // Find or create PDF progress record
            let pdfProgressRecord = await UserPDFProgress.findOne({
                lessonId: new mongoose.Types.ObjectId(lessonId),
                personId: new mongoose.Types.ObjectId(personId)
            });

            if (!pdfProgressRecord) {
                pdfProgressRecord = new UserPDFProgress({
                    lessonId: new mongoose.Types.ObjectId(lessonId),
                    personId: new mongoose.Types.ObjectId(personId),
                    schoolSiteId: schoolSiteId ? new mongoose.Types.ObjectId(schoolSiteId) : new mongoose.Types.ObjectId(personId),
                    readPDFs: [],
                    totalReadTime: 0
                });
            }

            // Find existing PDF entry by materialId or contentUrl
            const existingPDFIndex = pdfProgressRecord.readPDFs.findIndex((p: any) => (materialId ? p.materialId?.toString() === materialId : contentUrl ? p.contentUrl === contentUrl : p.contentUrl === pdfFileName));

            const calculatedReadPercentage = readPercentage || (totalPages > 0 ? Math.round((currentPageNumber / totalPages) * 100) : 0);

            const pdfEntry = {
                materialId: materialId ? new mongoose.Types.ObjectId(materialId) : undefined,
                contentUrl: contentUrl || pdfFileName, // Store URL for identification
                pagesRead: pagesRead || currentPageNumber || 1,
                totalPages: totalPages || 1, // Default to 1 to avoid validation error
                readPercentage: calculatedReadPercentage,
                completedAt: calculatedReadPercentage >= 90 ? new Date() : undefined
            };

            if (existingPDFIndex >= 0) {
                // Update existing entry - keep highest page read
                const existing = pdfProgressRecord.readPDFs[existingPDFIndex];
                if ((pagesRead || currentPageNumber) > (existing.pagesRead || 0)) {
                    pdfProgressRecord.readPDFs[existingPDFIndex] = {
                        ...existing,
                        ...pdfEntry
                    };
                }
            } else {
                pdfProgressRecord.readPDFs.push(pdfEntry as any);
            }

            // Update last read time
            pdfProgressRecord.lastReadAt = new Date();

            await pdfProgressRecord.save();

            return NextResponse.json({
                success: true,
                message: 'PDF progress saved',
                progress: pdfProgressRecord
            });
        } else {
            return NextResponse.json({ error: 'Invalid type. Must be "video" or "pdf"' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error saving content progress:', error);
        return NextResponse.json({ error: 'Failed to save content progress' }, { status: 500 });
    }
}
