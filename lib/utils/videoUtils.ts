/**
 * Extracts video ID from various video platform URLs
 */
export function extractVideoId(url: string): { platform: 'youtube' | 'vimeo' | 'google' | 'other'; id: string | null } {
  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern)
    if (match) {
      return { platform: 'youtube', id: match[1] }
    }
  }

  // Vimeo pattern
  const vimeoPattern = /vimeo\.com\/(\d+)/
  const vimeoMatch = url.match(vimeoPattern)
  if (vimeoMatch) {
    return { platform: 'vimeo', id: vimeoMatch[1] }
  }

  // Google Drive/Cloud pattern
  if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
    return { platform: 'google', id: url }
  }

  return { platform: 'other', id: url }
}

/**
 * Gets embed URL for different video platforms
 */
export function getVideoEmbedUrl(url: string): string | null {
  const { platform, id } = extractVideoId(url)

  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/embed/${id}`
    case 'vimeo':
      return `https://player.vimeo.com/video/${id}`
    case 'google':
    case 'other':
      return url
    default:
      return null
  }
}

/**
 * Validates if a URL is a valid video link
 */
export function isValidVideoUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}