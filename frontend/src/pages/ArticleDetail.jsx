import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, User, Calendar, Play } from 'lucide-react';
import { getArticle } from '../lib/api';

const categoryColors = {
    technique: 'bg-blue-100 text-blue-800',
    strategy: 'bg-purple-100 text-purple-800',
    fitness: 'bg-green-100 text-green-800',
    equipment: 'bg-orange-100 text-orange-800',
};

export default function ArticleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
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

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-12 text-gray-500">Loading article...</div>
            </div>
        );
    }

    if (!article) return null;

    const embedUrl = getYouTubeEmbedUrl(article.video_url);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="article-detail-page">
            {/* Back button */}
            <Link to="/education" className="inline-flex items-center gap-2 text-[#0051BA] font-medium hover:underline mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to Education
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
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </div>
                </div>
            </div>

            {/* Video */}
            {embedUrl && (
                <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-8 overflow-hidden">
                    <div className="aspect-video">
                        <iframe
                            src={embedUrl}
                            title={article.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </Card>
            )}

            {/* Image */}
            {article.image_url && !embedUrl && (
                <Card className="border-none shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-8 overflow-hidden">
                    <img 
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-auto"
                    />
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
                    <Button className="btn-secondary">
                        View More Articles
                    </Button>
                </Link>
            </div>
        </div>
    );
}
