/** Shared helpers for Improve / education materials */

export function getYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
}

export function isPdf(name) {
    return name?.toLowerCase().endsWith('.pdf');
}

export function isDocx(name) {
    return /\.docx$/i.test(name || '');
}

/** Legacy binary Word — not supported in browser preview */
export function isDocLegacy(name) {
    return /\.doc$/i.test(name || '') && !isDocx(name);
}

export function isPptx(name) {
    return /\.(ppt|pptx)$/i.test(name || '');
}

export function isImage(name) {
    return /\.(png|jpg|jpeg|gif|webp)$/i.test(name || '');
}

export function isVideoFile(name) {
    return /\.(mp4|webm|mov)$/i.test(name || '');
}

export function isTxt(name) {
    return /\.txt$/i.test(name || '');
}

/** Rough grouping for admin library filters */
export function getMaterialKind(article) {
    if (getYouTubeId(article?.video_url)) return 'youtube';
    const n = article?.file_name || '';
    if (isVideoFile(n)) return 'video';
    if (isPdf(n)) return 'pdf';
    if (isDocx(n) || isDocLegacy(n)) return 'document';
    if (isPptx(n)) return 'slides';
    if (isImage(n)) return 'image';
    if (article?.image_url) return 'infographic';
    if (article?.content_type === 'infographic') return 'infographic';
    return 'article';
}

export const categoryColors = {
    technique: 'bg-blue-100 text-blue-800',
    strategy: 'bg-purple-100 text-purple-800',
    fitness: 'bg-green-100 text-green-800',
    equipment: 'bg-orange-100 text-orange-800',
};
