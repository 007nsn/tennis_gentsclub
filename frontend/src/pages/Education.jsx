import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BookOpen, Play, Dumbbell, Target, Package, FileText, File as FileIcon, X, Download, ExternalLink, Presentation } from 'lucide-react';
import { getArticles, getFileUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const categories = [
    { id: 'all', label: 'All', icon: BookOpen },
    { id: 'technique', label: 'Technique', icon: Target },
    { id: 'strategy', label: 'Strategy', icon: BookOpen },
    { id: 'fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'equipment', label: 'Equipment', icon: Package },
];

const categoryColors = {
    technique: 'bg-blue-100 text-blue-800',
    strategy: 'bg-purple-100 text-purple-800',
    fitness: 'bg-green-100 text-green-800',
    equipment: 'bg-orange-100 text-orange-800',
};

const gradients = [
    'from-slate-700 via-slate-800 to-slate-900',
    'from-zinc-700 via-zinc-800 to-zinc-900',
    'from-neutral-700 via-neutral-800 to-neutral-900',
    'from-stone-700 via-stone-800 to-stone-900',
];

function getYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
}

function isPdf(name) { return name?.toLowerCase().endsWith('.pdf'); }
function isPptx(name) { return /\.(ppt|pptx)$/i.test(name || ''); }
function isImage(name) { return /\.(png|jpg|jpeg|gif|webp)$/i.test(name || ''); }

function ContentModal({ article, onClose }) {
    const { user } = useAuth();
    const youtubeId = getYouTubeId(article.video_url);
    const fileUrl = article.file_path ? getFileUrl(article.file_path) : null;

    const handleDownload = async () => {
        if (!article.file_path || !user) return;
        try {
            const res = await api.get(`/files/${article.file_path}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = article.file_name || 'download';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) { console.error(err); }
    };

    // Google Docs viewer for PDF/PPTX
    const getGoogleViewerUrl = (url) => {
        return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" data-testid="content-modal">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex-1 min-w-0">
                        <Badge className={`mb-1 ${categoryColors[article.category] || 'bg-gray-100 text-gray-800'}`}>
                            {article.category}
                        </Badge>
                        <h2 className="font-['Barlow_Condensed'] text-xl font-bold uppercase truncate">{article.title}</h2>
                        <p className="text-xs text-gray-400">By {article.author_name}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        {article.file_path && user && (
                            <Button size="sm" variant="outline" onClick={handleDownload} data-testid="modal-download-btn">
                                <Download className="w-4 h-4 mr-1" /> Download
                            </Button>
                        )}
                        {youtubeId && (
                            <a href={`https://www.youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline"><ExternalLink className="w-4 h-4 mr-1" /> YouTube</Button>
                            </a>
                        )}
                        <Button size="icon" variant="ghost" onClick={onClose} data-testid="close-modal-btn">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto">
                    {/* YouTube embed */}
                    {youtubeId && (
                        <div className="aspect-video bg-black">
                            <iframe
                                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                                title={article.title}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}

                    {/* PDF viewer */}
                    {fileUrl && isPdf(article.file_name) && user && (
                        <div className="aspect-[4/3] bg-gray-100">
                            <iframe
                                src={getGoogleViewerUrl(fileUrl)}
                                title={article.file_name}
                                className="w-full h-full border-0"
                            />
                        </div>
                    )}

                    {/* PPTX viewer via Google Docs */}
                    {fileUrl && isPptx(article.file_name) && user && (
                        <div className="aspect-video bg-gray-100">
                            <iframe
                                src={getGoogleViewerUrl(fileUrl)}
                                title={article.file_name}
                                className="w-full h-full border-0"
                            />
                        </div>
                    )}

                    {/* Image */}
                    {fileUrl && isImage(article.file_name) && user && (
                        <div className="flex justify-center bg-gray-50 p-4">
                            <img src={fileUrl} alt={article.file_name} className="max-w-full max-h-[60vh] object-contain rounded" />
                        </div>
                    )}

                    {/* Article image */}
                    {article.image_url && !youtubeId && (
                        <div className="flex justify-center bg-gray-50">
                            <img src={article.image_url} alt={article.title} className="max-w-full max-h-[50vh] object-contain" />
                        </div>
                    )}

                    {/* Text content */}
                    <div className="px-6 py-5">
                        <div className="prose prose-sm max-w-none">
                            {article.content.split('\n').map((p, i) => (
                                p.trim() && <p key={i} className="mb-3 text-gray-700 leading-relaxed">{p}</p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ContentCard({ article, onClick, index }) {
    const youtubeId = getYouTubeId(article.video_url);
    const [imgError, setImgError] = useState(false);
    const gradient = gradients[index % gradients.length];

    const renderThumbnail = () => {
        // YouTube: high-res thumbnail
        if (youtubeId && !imgError) {
            return (
                <div className="relative h-full">
                    <img
                        src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            if (e.target.src.includes('maxresdefault')) {
                                e.target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                            } else {
                                setImgError(true);
                            }
                        }}
                        loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 bg-red-600/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-white ml-0.5" />
                        </div>
                    </div>
                </div>
            );
        }

        // Image URL
        if (article.image_url && !imgError) {
            return <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" onError={() => setImgError(true)} loading="lazy" />;
        }

        // PDF file
        if (article.file_name && isPdf(article.file_name)) {
            return (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center relative`}>
                    <div className="w-16 h-20 bg-white/10 rounded-lg flex items-center justify-center mb-2 backdrop-blur-sm border border-white/20">
                        <FileText className="w-8 h-8 text-red-400" />
                    </div>
                    <span className="text-white/70 text-xs font-medium">PDF Document</span>
                    <p className="text-white/90 text-sm font-bold mt-2 px-4 text-center line-clamp-2">{article.title}</p>
                </div>
            );
        }

        // PPTX file
        if (article.file_name && isPptx(article.file_name)) {
            return (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center relative`}>
                    <div className="w-16 h-20 bg-white/10 rounded-lg flex items-center justify-center mb-2 backdrop-blur-sm border border-white/20">
                        <Presentation className="w-8 h-8 text-orange-400" />
                    </div>
                    <span className="text-white/70 text-xs font-medium">Presentation</span>
                    <p className="text-white/90 text-sm font-bold mt-2 px-4 text-center line-clamp-2">{article.title}</p>
                </div>
            );
        }

        // Other file
        if (article.file_name) {
            return (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center`}>
                    <div className="w-16 h-20 bg-white/10 rounded-lg flex items-center justify-center mb-2 backdrop-blur-sm border border-white/20">
                        <FileIcon className="w-8 h-8 text-blue-400" />
                    </div>
                    <span className="text-white/70 text-xs font-medium">{article.file_name.split('.').pop().toUpperCase()}</span>
                    <p className="text-white/90 text-sm font-bold mt-2 px-4 text-center line-clamp-2">{article.title}</p>
                </div>
            );
        }

        // Fallback: blurred gradient with title
        return (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center p-6`}>
                <p className="text-white/90 text-lg font-bold text-center line-clamp-3">{article.title}</p>
            </div>
        );
    };

    return (
        <Card
            className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
            onClick={onClick}
            data-testid={`article-card-${article.id}`}
        >
            <div className="relative h-48">
                {renderThumbnail()}
                <div className="absolute top-3 left-3">
                    <Badge className={`${categoryColors[article.category] || 'bg-gray-100 text-gray-800'} shadow-sm`}>
                        {article.category}
                    </Badge>
                </div>
                {article.content_type && (
                    <div className="absolute top-3 right-3">
                        <Badge className="bg-black/50 text-white text-[10px] backdrop-blur-sm">
                            {article.content_type}
                        </Badge>
                    </div>
                )}
            </div>
            <CardContent className="p-4">
                <h3 className="font-bold text-base mb-1.5 group-hover:text-[#0051BA] transition-colors line-clamp-2">
                    {article.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-3">{article.content.substring(0, 100)}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{article.author_name}</span>
                    <span>{new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Education() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedArticle, setSelectedArticle] = useState(null);

    useEffect(() => {
        loadArticles();
    }, [activeCategory]);

    const loadArticles = async () => {
        try {
            const category = activeCategory === 'all' ? undefined : activeCategory;
            const response = await getArticles(category);
            setArticles(response.data);
        } catch (error) {
            console.error('Error loading articles:', error);
        } finally {
            setLoading(false);
        }
    };

    // Close modal on Escape
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') setSelectedArticle(null); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="education-page">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-8 h-8 text-[#0051BA]" />
                    <h1 className="font-['Barlow_Condensed'] text-4xl md:text-5xl font-black uppercase tracking-tight text-[#0F172A]">
                        Improve
                    </h1>
                </div>
                <p className="text-gray-600">Tennis tips, techniques, and coaching from your club</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : articles.length === 0 && activeCategory === 'all' ? (
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="py-20 text-center">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                        <p className="text-gray-500">Content is being prepared. Check back soon!</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Category Tabs */}
                    <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
                        <TabsList className="bg-white border border-gray-100 p-1 h-auto flex-wrap">
                            {categories.map(cat => (
                                <TabsTrigger
                                    key={cat.id}
                                    value={cat.id}
                                    className="data-[state=active]:bg-[#0051BA] data-[state=active]:text-white rounded-lg px-4 py-2 flex items-center gap-2"
                                    data-testid={`category-tab-${cat.id}`}
                                >
                                    <cat.icon className="w-4 h-4" />
                                    {cat.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {/* Masonry-style Grid */}
                    {articles.length === 0 ? (
                        <Card className="border-none">
                            <CardContent className="py-16 text-center">
                                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-xl font-bold mb-2">No content in this category</h3>
                                <p className="text-gray-500">Try a different category or check back later.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
                            {articles.map((article, idx) => (
                                <div key={article.id} className="break-inside-avoid mb-6">
                                    <ContentCard
                                        article={article}
                                        index={idx}
                                        onClick={() => setSelectedArticle(article)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal Overlay */}
            {selectedArticle && (
                <ContentModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
            )}
        </div>
    );
}
