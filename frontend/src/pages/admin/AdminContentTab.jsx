import { useState, useRef } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { BookOpen, Plus, Trash2, Video, FileText, Image, ClipboardList, Upload, Loader2, File, X } from 'lucide-react';
import { uploadFile } from '../../lib/api';
import { toast } from 'sonner';

export function AdminContentTab({ articles, loading, onCreateArticle, onDeleteArticle, onSeedContent, onClearContent }) {
    const [articleForm, setArticleForm] = useState({
        title: '', content: '', category: 'technique', content_type: 'article',
        video_url: '', image_url: '', file_path: '', file_name: '', file_content_type: ''
    });
    const [uploading, setUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (file) => {
        if (!file) return;
        const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) {
            toast.error(`File type .${ext} not supported. Use: ${allowed.join(', ')}`);
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File too large (max 50MB)');
            return;
        }
        setUploading(true);
        try {
            const res = await uploadFile(file);
            const data = res.data;
            setUploadedFile({ name: file.name, path: data.path, type: file.type });
            setArticleForm(prev => ({
                ...prev,
                file_path: data.path,
                file_name: file.name,
                file_content_type: file.type
            }));
            toast.success(`Uploaded: ${file.name}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const clearFile = () => {
        setUploadedFile(null);
        setArticleForm(prev => ({ ...prev, file_path: '', file_name: '', file_content_type: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCreateArticle = async (e) => {
        e.preventDefault();
        if (!articleForm.title || !articleForm.content || !articleForm.category) return;
        const success = await onCreateArticle(articleForm);
        if (success) {
            setArticleForm({
                title: '', content: '', category: 'technique', content_type: 'article',
                video_url: '', image_url: '', file_path: '', file_name: '', file_content_type: ''
            });
            setUploadedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getFileIcon = (name) => {
        if (!name) return File;
        const ext = name.split('.').pop().toLowerCase();
        if (ext === 'pdf') return FileText;
        if (['doc', 'docx'].includes(ext)) return FileText;
        if (['ppt', 'pptx'].includes(ext)) return FileText;
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return Image;
        return File;
    };

    return (
        <TabsContent value="content">
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Add Educational Content</CardTitle>
                        <CardDescription>Upload articles, videos, PDFs, or presentations</CardDescription>
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
                                        <SelectItem value="survey"><ClipboardList className="w-4 h-4 inline mr-2" />Survey</SelectItem>
                                        <SelectItem value="document"><File className="w-4 h-4 inline mr-2" />Document</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Textarea value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} placeholder="Description or content..." className="min-h-24" data-testid="article-content-input" />
                            <Input value={articleForm.video_url} onChange={(e) => setArticleForm({ ...articleForm, video_url: e.target.value })} placeholder="YouTube URL (optional)" data-testid="video-url-input" />

                            {/* File Upload Area */}
                            <div
                                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-[#0051BA] transition-colors cursor-pointer"
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onClick={() => !uploading && fileInputRef.current?.click()}
                                data-testid="file-upload-area"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp"
                                    onChange={(e) => handleFileUpload(e.target.files[0])}
                                />
                                {uploading ? (
                                    <div className="flex items-center justify-center gap-2 py-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-[#0051BA]" />
                                        <span className="text-sm text-gray-500">Uploading...</span>
                                    </div>
                                ) : uploadedFile ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {(() => { const Icon = getFileIcon(uploadedFile.name); return <Icon className="w-5 h-5 text-[#0051BA]" />; })()}
                                            <span className="text-sm font-medium">{uploadedFile.name}</span>
                                        </div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); clearFile(); }} className="text-gray-400 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-2">
                                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm text-gray-500">Drag & drop or click to upload</p>
                                        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PPTX, images (max 50MB)</p>
                                    </div>
                                )}
                            </div>

                            <Button type="submit" className="w-full btn-primary" disabled={loading || uploading} data-testid="create-article-btn">
                                <Plus className="w-4 h-4 mr-2" />Add Content
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader><CardTitle>Existing Content ({articles.length})</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {articles.map(article => {
                                const ytId = article.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
                                return (
                                    <div key={article.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg" data-testid={`article-${article.id}`}>
                                        {/* Mini preview */}
                                        <div className="w-16 h-12 rounded-md overflow-hidden shrink-0 bg-gray-200">
                                            {ytId ? (
                                                <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} alt="" className="w-full h-full object-cover" />
                                            ) : article.image_url ? (
                                                <img src={article.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                    {article.content_type === 'video' && <Video className="w-4 h-4 text-red-400" />}
                                                    {article.content_type === 'document' && <File className="w-4 h-4 text-orange-400" />}
                                                    {article.content_type === 'article' && <FileText className="w-4 h-4 text-blue-400" />}
                                                    {article.content_type === 'survey' && <ClipboardList className="w-4 h-4 text-green-400" />}
                                                    {article.content_type === 'infographic' && <Image className="w-4 h-4 text-purple-400" />}
                                                    {!article.content_type && <FileText className="w-4 h-4 text-gray-400" />}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{article.title}</div>
                                            <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                                <span>{article.category}</span>
                                                {article.file_name && <span className="text-[#0051BA]">{article.file_name}</span>}
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 shrink-0" onClick={() => onDeleteArticle(article.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                            {articles.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No content yet</p>}
                        </div>
                    </CardContent>
                </Card>
                {onClearContent && (
                    <div className="lg:col-span-2 pt-2">
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (window.confirm('Delete all articles, scout reports & strategy chats?')) onClearContent(); }} data-testid="clear-content-btn">
                            <Trash2 className="w-3 h-3 mr-1" /> Clear All Content
                        </Button>
                    </div>
                )}
            </div>
        </TabsContent>
    );
}
