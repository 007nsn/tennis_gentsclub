import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BookOpen, Play, Dumbbell, Target, Package, ArrowRight, FileText, File as FileIcon } from 'lucide-react';
import { getArticles } from '../lib/api';

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

export default function Education() {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');

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

    const getYouTubeId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        return match ? match[1] : null;
    };

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
                <p className="text-gray-600">Tennis tips, techniques, and coaching from your club coach</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : articles.length === 0 && activeCategory === 'all' ? (
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="py-20 text-center">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                        <p className="text-gray-500">Your coach is preparing content. Check back soon for articles, videos, and drills!</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Coach Introduction */}
                    <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="grid md:grid-cols-2 gap-0">
                                <div className="p-8 flex flex-col justify-center">
                                    <Badge className="w-fit bg-[#CCFF00] text-[#002040] mb-4">Your Coach</Badge>
                                    <h2 className="font-['Barlow_Condensed'] text-2xl font-bold uppercase mb-4">
                                        Improve Your Game
                                    </h2>
                                    <p className="text-gray-600 mb-4">
                                        Access coaching tips, technique videos, and strategy guides to take your tennis to the next level. 
                                        Whether you're working on your serve, volleys, or match tactics, we've got you covered.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Technique', 'Strategy', 'Fitness', 'Equipment'].map(cat => (
                                            <Badge key={cat} variant="outline" className="border-[#0051BA] text-[#0051BA]">
                                                {cat}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative h-64 md:h-auto">
                                    <img 
                                        src="https://images.pexels.com/photos/35214654/pexels-photo-35214654.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                                        alt="Tennis coaching"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

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

                    {/* Articles Grid */}
                    {articles.length === 0 ? (
                        <Card className="border-none">
                            <CardContent className="py-16 text-center">
                                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-xl font-bold mb-2">No content in this category</h3>
                                <p className="text-gray-500">Try a different category or check back later.</p>
                            </CardContent>
                        </Card>
                    ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map(article => {
                        const youtubeId = getYouTubeId(article.video_url);
                        return (
                            <Card 
                                key={article.id} 
                                className="education-card border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden"
                                onClick={() => navigate(`/education/${article.id}`)}
                                data-testid={`article-card-${article.id}`}
                            >
                                {/* Thumbnail */}
                                <div className="relative h-48">
                                    {youtubeId ? (
                                        <div className="video-thumbnail h-full">
                                            <img 
                                                src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                                                alt={article.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="video-play-button">
                                                <Play className="w-6 h-6 text-[#002040] ml-1" />
                                            </div>
                                        </div>
                                    ) : article.image_url ? (
                                        <img 
                                            src={article.image_url}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : article.file_name ? (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center">
                                            {article.file_name.toLowerCase().endsWith('.pdf') ? (
                                                <FileText className="w-12 h-12 text-red-400 mb-2" />
                                            ) : (
                                                <FileIcon className="w-12 h-12 text-blue-400 mb-2" />
                                            )}
                                            <span className="text-xs text-gray-500 px-4 text-center truncate max-w-full">{article.file_name}</span>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#0051BA] to-[#003E94] flex items-center justify-center">
                                            <BookOpen className="w-12 h-12 text-white/50" />
                                        </div>
                                    )}
                                    <div className="category-badge">
                                        <Badge className={categoryColors[article.category] || 'bg-gray-100 text-gray-800'}>
                                            {article.category}
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-5">
                                    <h3 className="font-bold text-lg mb-2 group-hover:text-[#0051BA] transition-colors line-clamp-2">
                                        {article.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                        {article.content.substring(0, 100)}...
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">
                                            By {article.author_name}
                                        </span>
                                        <span className="text-[#0051BA] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                                            Read More <ArrowRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
                    )}
                </>
            )}
        </div>
    );
}
