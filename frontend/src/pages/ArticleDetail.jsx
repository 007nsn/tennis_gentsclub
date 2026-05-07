import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, User, Calendar } from 'lucide-react';
import { getArticle } from '../lib/api';
import { MaterialMediaBody } from '../components/MaterialMediaBody';
import { categoryColors } from '../lib/educationMedia';

export default function ArticleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const response = await getArticle(id);
                if (!cancelled) setArticle(response.data);
            } catch (error) {
                if (!cancelled) {
                    console.error('Error loading article:', error);
                    navigate('/education');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-12 text-gray-500">Loading article...</div>
            </div>
        );
    }

    if (!article) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="article-detail-page">
            <Link to="/education" className="inline-flex items-center gap-2 text-[#0051BA] font-medium hover:underline mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to Improve
            </Link>

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
                            year: 'numeric', month: 'long', day: 'numeric',
                        })}
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <MaterialMediaBody article={article} />
            </div>

            {article.file_name && (
                <p className="text-xs text-gray-400 mb-6">
                    Attachment: {article.file_name} — in-browser viewing only; downloads are not offered in the app.
                </p>
            )}

            <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardContent className="p-8">
                    <div className="prose prose-lg max-w-none">
                        {(article.content || '').split('\n').map((paragraph, idx) => (
                            paragraph.trim() && <p key={idx} className="mb-4 text-gray-700 leading-relaxed">{paragraph}</p>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 flex justify-center">
                <Link to="/education">
                    <Button className="btn-secondary">View More Content</Button>
                </Link>
            </div>
        </div>
    );
}
