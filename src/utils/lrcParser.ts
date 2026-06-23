export interface LyricLine {
    time: number;
    text: string;
}

/**
 * Parses raw LRC or USLT text into an array of LyricLine objects.
 * Supports standard [mm:ss.xx] time tags.
 */
export function parseLRC(rawText: string): LyricLine[] {
    if (!rawText) return [];

    const lines = rawText.split('\n');
    const result: LyricLine[] = [];
    for (const line of lines) {
        let match;
        const times: number[] = [];
        const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
        
        // Find all time tags in the current line (some lines have multiple tags for repeated choruses)
        while ((match = timeRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1) : 0;
            times.push(minutes * 60 + seconds + ms / 1000);
        }

        const textPart = line.replace(timeRegex, '').trim();

        if (times.length > 0 && textPart) {
            for (const t of times) {
                result.push({ time: t, text: textPart });
            }
        } else if (times.length === 0 && textPart) {
            // Unsynchronized lyrics (fallback)
            // Just push with time 0 so they can at least be displayed statically
            result.push({ time: -1, text: textPart });
        }
    }

    // Sort by time in case there were multiple tags out of order
    return result.sort((a, b) => a.time - b.time);
}
