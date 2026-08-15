/**
 * Formats a duration in seconds into a standard MM:SS string.
 */
export function formatSecondsToTimecode(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parses timecode string (MM:SS or HH:MM:SS) into seconds.
 */
export function parseTimecodeToSeconds(timecode: string): number {
  if (!timecode) return 0;
  const parts = timecode.trim().split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }
  const parsed = parseFloat(timecode);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Generates a unique session ID string like session_1723700000
 */
export function generateSessionId(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.floor(100 + Math.random() * 900);
  return `session_${timestamp}_${random}`;
}

/**
 * Formats file size in readable bytes (e.g., 14.2 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
