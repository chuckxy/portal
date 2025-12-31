import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to determine resource type based on file extension/mimetype
function getResourceType(filename: string, mimeType: string): 'video' | 'image' | 'raw' | 'auto' {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // Video types
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv'].includes(ext) || mimeType.startsWith('video/')) {
        return 'video';
    }

    // Audio types - Cloudinary treats audio as 'video'
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'].includes(ext) || mimeType.startsWith('audio/')) {
        return 'video';
    }

    // Image types
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mimeType.startsWith('image/')) {
        return 'image';
    }

    // Raw files (PDF, documents, etc.)
    return 'raw';
}

// Helper to get folder based on content type
function getUploadFolder(contentType: string): string {
    const folders: Record<string, string> = {
        video: 'lms/videos',
        audio: 'lms/audio',
        pdf: 'lms/documents',
        image: 'lms/images',
        attachment: 'lms/attachments'
    };
    return folders[contentType] || 'lms/misc';
}

export async function POST(request: NextRequest) {
    try {
        // Check if Cloudinary is configured
        if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return NextResponse.json({ success: false, error: 'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.' }, { status: 500 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const contentType = (formData.get('contentType') as string) || 'attachment';
        const schoolSiteId = (formData.get('schoolSiteId') as string) || '';
        const lessonId = (formData.get('lessonId') as string) || '';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // Get file buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Determine resource type
        const resourceType = getResourceType(file.name, file.type);
        const folder = getUploadFolder(contentType);

        // Generate unique public ID
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]+$/, '');
        const publicId = `${folder}/${schoolSiteId || 'global'}/${lessonId || timestamp}_${sanitizedName}`;

        // Upload to Cloudinary
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    public_id: publicId,
                    folder: '', // Already included in public_id
                    overwrite: true,
                    // For videos, enable streaming
                    ...(resourceType === 'video' && {
                        eager: [{ streaming_profile: 'hd', format: 'm3u8' }],
                        eager_async: true
                    })
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            uploadStream.end(buffer);
        });

        // Return upload result
        return NextResponse.json({
            success: true,
            data: {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
                resourceType: uploadResult.resource_type,
                format: uploadResult.format,
                size: uploadResult.bytes,
                width: uploadResult.width,
                height: uploadResult.height,
                duration: uploadResult.duration, // For video/audio
                originalFilename: file.name
            }
        });
    } catch (error: any) {
        console.error('Cloudinary upload error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
    }
}

// DELETE endpoint to remove files from Cloudinary
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const publicId = searchParams.get('publicId');
        const resourceType = searchParams.get('resourceType') || 'image';

        if (!publicId) {
            return NextResponse.json({ success: false, error: 'Public ID is required' }, { status: 400 });
        }

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType as any
        });

        return NextResponse.json({
            success: true,
            result
        });
    } catch (error: any) {
        console.error('Cloudinary delete error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Delete failed' }, { status: 500 });
    }
}
