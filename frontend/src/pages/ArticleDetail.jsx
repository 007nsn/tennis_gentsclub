import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, User, Calendar, Download, FileText, File, Play, ExternalLink, Lock } from 'lucide-react';
import { getArticle, getFileUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const categoryColors = {
    technique: 'bg-blue-100 text-blue-800',
    strategy: 'bg-purple-100 text-purple-800',
    fitness: 'bg-green-100 text-green-800',
    equipment: 'bg-orange-100 text-orange-800',
};

const isVideo = (name) => /\.(mp4|webm|mov)$/i.test(name || '');

export default function ArticleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadArticle();
    }, [id]);

    const loadArticle = async () => {
        try {
            const response = await getArticle(id);
            setArticle(response.data);
        } catch (error) {
            console.error('Error loading article:', error);
            navigate('/education');
        } finally {
            setLoading(false);
        }
    };

    const getYouTubeId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        return match ? match[1] : null;
    };

    const getYouTubeUrl = (url) => {
        const ytId = getYouTubeId(url);
        return ytId ? `https://www.youtube.com/watch?v=${ytId}` : url;
    };

    const isPdf = (name) => name?.toLowerCase().endsWith('.pdf');
    const isImage = (name) => /\.(png|jpg|jpeg|gif|webp)$/i.test(name || '');

    const handleDownload = async () => {
        if (!article?.file_path) return;
        try {
            const response = await api.get(`/files/${article.file_path}`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = article.file_name || 'download';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-12 text-gray-500">Loading article...</div>
            </div>
        );
    }

    if (!article) return null;

    const youtubeId = getYouTubeId(article.video_url);
    const youtubeUrl = getYouTubeUrl(article.video_url);
    const fileUrl = article.file_path ? getFileUrl(article.file_path) : null;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="article-detail-page">
            {/* Back button */}
            <Link to="/education" className="inline-flex items-center gap-2 text-[#0051BA] font-medium hover:underline mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to Improve
            </Link>

            {/* Article Header */}
            <div className="mb-8">
                <Badge className={`mb-4 ${categoryColors[article.category] || 'bg-gray-100 text-gray-800'}`}>
                    {article.category}
                </Badge>
                <h1 className="font-['Barlow_Condensed'] text-3xl md:text-4xl font-black uppercase tracking-tight text-[#0F172A] mb-4">
                    {article.title}
                </h1>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {article.author_name}
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(article.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                    </div>
                </div>
            </div>

            {/* YouTube Video - Clickable Thumbnail */}
            {youtubeId && (
                <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-8 group"
                    data-testid="youtube-link"
                >
                    <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] overflow-hidden">
                        <div className="relative aspect-video">
                            <img
                                src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:brightness-90 transition-all"
                                onError={(e) => { e.target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="w-7 h-7 text-white ml-1" />
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                <div className="flex items-center gap-2 text-white text-sm">
                                    <ExternalLink className="w-4 h-4" />
                                    Watch on YouTube
                                </div>
                            </div>
                        </div>
                    </Card>
                </a>
            )}

            {/* Image */}
            {article.image_url && !youtubeId && (
                <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-8 overflow-hidden">
                    <img src={article.image_url} alt={article.title} className="w-full h-auto" />
                </Card>
            )}

            {/* Uploaded video */}
            {fileUrl && user && isVideo(article.file_name) && (
                <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-8 overflow-hidden" data-testid="video-preview">
                    <div className="aspect-video bg-black">
                        <video controls className="w-full h-full" preload="metadata">
                            <source src={fileUrl} type={article.file_content_type || 'video/mp4'} />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </Card>
            )}

            {/* Attached File - Preview & Download (login required) */}
            {fileUrl && user && isPdf(article.file_name) && (
                <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-8 overflow-hidden" data-testid="pdf-preview">
                    <div className="aspect-[4/3]">
                        <iframe src={fileUrl} title={article.file_name} className="w-full h-full" />
                    </div>
                </Card>
            )}

            {fileUrl && user && isImage(article.file_name) && (
                <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-8 overflow-hidden" data-testid="image-preview">
                    <img src={fileUrl} alt={article.file_name} className="w-full h-auto" />
                </Card>
            )}

            {/* Download Button */}
            {article.file_path && (
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8" data-testid="file-download">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPdf(article.file_name) ? 'bg-red-100' : 'bg-blue-100'}`}>
                                    {isPdf(article.file_name) ? <FileText className="w-5 h-5 text-red-600" /> : <File className="w-5 h-5 text-blue-600" />}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{article.file_name}</p>
                                    <p className="text-xs text-gray-500">{article.file_content_type || 'Document'}</p>
                                </div>
                            </div>
                            {user ? (
                                <Button size="sm" className="bg-[#0051BA]" onClick={handleDownload} data-testid="download-btn">
                                    <Download className="w-4 h-4 mr-1" /> Download
                                </Button>
                            ) : (
                                <Link to="/login">
                                    <Button size="sm" variant="outline" className="text-gray-500" data-testid="login-to-download-btn">
                                        <Lock className="w-4 h-4 mr-1" /> Log in to download
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Content */}
            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardContent className="p-8">
                    <div className="prose prose-lg max-w-none">
                        {article.content.split('\n').map((paragraph, idx) => (
                            paragraph.trim() && <p key={idx} className="mb-4 text-gray-700 leading-relaxed">{paragraph}</p>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="mt-8 flex justify-center">
                <Link to="/education">
                    <Button className="btn-secondary">View More Content</Button>
                </Link>
            </div>
        </div>
    );
}
