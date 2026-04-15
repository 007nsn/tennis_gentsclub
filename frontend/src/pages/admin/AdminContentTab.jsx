import { useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { BookOpen, Plus, Trash2, Video, FileText, Image } from 'lucide-react';

export function AdminContentTab({ articles, loading, onCreateArticle, onDeleteArticle, onSeedContent }) {
    const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'technique', content_type: 'article', video_url: '', image_url: '' });

    const handleCreateArticle = async (e) => {
        e.preventDefault();
        if (!articleForm.title || !articleForm.content || !articleForm.category) {
            return;
        }
        const success = await onCreateArticle(articleForm);
        if (success) {
            setArticleForm({ title: '', content: '', category: 'technique', content_type: 'article', video_url: '', image_url: '' });
        }
    };

    return (
        <TabsContent value="content">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Add Educational Content</CardTitle>
                        <CardDescription>Create articles, videos, or infographics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateArticle} className="space-y-4">
                            <Input value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} placeholder="Title" data-testid="article-title-input" />
                            <div className="grid grid-cols-2 gap-4">
                                <Select value={articleForm.category} onValueChange={(v) => setArticleForm({ ...articleForm, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="technique">Technique</SelectItem>
                                        <SelectItem value="strategy">Strategy</SelectItem>
                                        <SelectItem value="fitness">Fitness</SelectItem>
                                        <SelectItem value="equipment">Equipment</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={articleForm.content_type} onValueChange={(v) => setArticleForm({ ...articleForm, content_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="article"><FileText className="w-4 h-4 inline mr-2" />Article</SelectItem>
                                        <SelectItem value="video"><Video className="w-4 h-4 inline mr-2" />Video</SelectItem>
                                        <SelectItem value="infographic"><Image className="w-4 h-4 inline mr-2" />Infographic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Textarea value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} placeholder="Content..." className="min-h-32" data-testid="article-content-input" />
                            <Input value={articleForm.video_url} onChange={(e) => setArticleForm({ ...articleForm, video_url: e.target.value })} placeholder="YouTube URL (optional)" />
                            <Input value={articleForm.image_url} onChange={(e) => setArticleForm({ ...articleForm, image_url: e.target.value })} placeholder="Image URL (optional)" />
                            <Button type="submit" className="w-full btn-primary" disabled={loading} data-testid="create-article-btn"><Plus className="w-4 h-4 mr-2" />Add Content</Button>
                        </form>
                        <div className="mt-4 pt-4 border-t">
                            <Button variant="outline" onClick={onSeedContent} className="w-full" data-testid="seed-content-btn">
                                <BookOpen className="w-4 h-4 mr-2" />Add Sample Content
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader><CardTitle>Existing Content</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {articles.map(article => (
                                <div key={article.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`article-${article.id}`}>
                                    <div className="flex items-center gap-3">
                                        {article.content_type === 'video' && <Video className="w-5 h-5 text-red-500" />}
                                        {article.content_type === 'infographic' && <Image className="w-5 h-5 text-purple-500" />}
                                        {article.content_type === 'article' && <FileText className="w-5 h-5 text-blue-500" />}
                                        <div>
                                            <div className="font-medium">{article.title}</div>
                                            <div className="text-sm text-gray-500">{article.category}</div>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onDeleteArticle(article.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}
