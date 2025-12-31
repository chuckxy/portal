'use client';

import React from 'react';
import ReactPlayerBase from 'react-player';

// Progress state interface - This matches what ReactPlayer actually sends
export interface VideoProgressState {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
}

interface VideoPlayerProps {
    url: string;
    playing?: boolean;
    controls?: boolean;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    onProgress?: (state: VideoProgressState) => void;
    progressInterval?: number;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (error: any) => void;
    onReady?: () => void;
    pip?: boolean;
    className?: string;
    playerRef?: React.MutableRefObject<any>;
}

/**
 * VideoPlayer component wrapping react-player with consistent interface
 * Using the new react-player v3.x API which uses src prop and native HTML5 video events
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, playing = false, controls = true, width = '100%', height = '100%', style, onProgress, onPlay, onPause, onEnded, onError, onReady, pip = false, className, playerRef }) => {
    // Handle time update to create progress-like behavior
    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        if (onProgress) {
            const video = e.currentTarget;
            const duration = video.duration || 1;
            const currentTime = video.currentTime || 0;
            const buffered = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;
            onProgress({
                played: currentTime / duration,
                playedSeconds: currentTime,
                loaded: buffered / duration,
                loadedSeconds: buffered
            });
        }
    };

    return (
        <div className={className}>
            <ReactPlayerBase
                ref={playerRef}
                src={url}
                playing={playing}
                controls={controls}
                width={width}
                height={height}
                style={style}
                onTimeUpdate={handleTimeUpdate}
                onPlay={onPlay}
                onPause={onPause}
                onEnded={onEnded}
                onError={onError as any}
                onReady={onReady}
                pip={pip}
            />
        </div>
    );
};

export default VideoPlayer;
