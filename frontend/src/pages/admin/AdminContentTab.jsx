import { useState, useRef, useMemo } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Trash2, Video, FileText, Image, ClipboardList, Upload, Loader2, File, X, Sparkles, Search } from 'lucide-react';
import { uploadFile } from '../../lib/api';
import { toast } from 'sonner';
import { MaterialMediaBody } from '../../components/MaterialMediaBody';
import { getMaterialKind, categoryColors } from '../../lib/educationMedia';

const TYPE_FILTER = [
    { id: 'all', label: 'Все типы' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'video', label: 'Видео файл' },
    { id: 'pdf', label: 'PDF' },
    { id: 'document', label: 'Word (.docx)' },
    { id: 'slides', label: 'Слайды' },
    { id: 'image', label: 'Изображение' },
    { id: 'infographic', label: 'Инфографика' },
    { id: 'article', label: 'Текст' },
];

export function AdminContentTab({ articles, loading, onCreateArticle, onDeleteArticle, onSeedContent, onClearContent }) {
    const [articleForm, setArticleForm] = useState({
        title: '', content: '', category: 'technique', content_type: 'article',
        video_url: '', image_url: '', file_path: '', file_name: '', file_content_type: '',
    });
    const [uploading, setUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);

    const [query, setQuery] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [previewArticle, setPreviewArticle] = useState(null);

    const filteredArticles = useMemo(() => {
        const q = query.trim().toLowerCase();
        return [...articles]
            .filter((a) => {
                if (filterCat !== 'all' && a.category !== filterCat) return false;
                const kind = getMaterialKind(a);
                if (filterType !== 'all' && kind !== filterType) return false;
                if (!q) return true;
                const hay = `${a.title || ''} ${a.file_name || ''} ${a.content || ''}`.toLowerCase();
                return hay.includes(q);
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [articles, query, filterCat, filterType]);

    const handleFileUpload = async (file) => {
        if (!file) return;
        const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) {
            toast.error(`Тип .${ext} не поддерживается.`);
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            toast.error('Файл больше 50 МБ');
            return;
        }
        setUploading(true);
        try {
            const res = await uploadFile(file);
            const data = res.data;
            setUploadedFile({ name: file.name, path: data.path, type: file.type });
            setArticleForm((prev) => ({
                ...prev,
                file_path: data.path,
                file_name: file.name,
                file_content_type: file.type,
            }));
            toast.success(`Загружено: ${file.name}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Ошибка загрузки');
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
        setArticleForm((prev) => ({ ...prev, file_path: '', file_name: '', file_content_type: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCreateArticle = async (e) => {
        e.preventDefault();
        if (!articleForm.title || !articleForm.content || !articleForm.category) return;
        const success = await onCreateArticle(articleForm);
        if (success) {
            setArticleForm({
                title: '', content: '', category: 'technique', content_type: 'article',
                video_url: '', image_url: '', file_path: '', file_name: '', file_content_type: '',
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

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Удалить этот материал?')) return;
        await onDeleteArticle(id);
        if (previewArticle?.id === id) setPreviewArticle(null);
    };

    return (
        <TabsContent value="content">
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="font-['Barlow_Condensed'] text-2xl font-black uppercase text-[#0F172A] tracking-tight">
                            Библиотека Improve
                        </h2>
                        <p className="text-sm text-gray-600 max-w-2xl">
                            Один центр: добавление материалов и предпросмотр, как их увидят игроки на странице Improve. Просмотр только на сайте, без кнопок скачивания.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {onSeedContent && (
                            <Button type="button" size="sm" variant="outline" className="text-[#0051BA] border-[#0051BA]/30" onClick={() => onSeedContent()} data-testid="seed-content-btn">
                                <Sparkles className="w-4 h-4 mr-1" /> Примеры
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid xl:grid-cols-12 gap-4 items-start">
                    <Card className="xl:col-span-4 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Добавить материал</CardTitle>
                            <CardDescription className="text-xs">Категории совпадают с фильтрами на Improve.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateArticle} className="space-y-3">
                                <Input
                                    value={articleForm.title}
                                    onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                                    placeholder="Заголовок"
                                    data-testid="article-title-input"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={articleForm.category} onValueChange={(v) => setArticleForm({ ...articleForm, category: v })}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="technique">Техника</SelectItem>
                                            <SelectItem value="strategy">Стратегия / даблс</SelectItem>
                                            <SelectItem value="fitness">Фитнес</SelectItem>
                                            <SelectItem value="equipment">Экипировка</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={articleForm.content_type} onValueChange={(v) => setArticleForm({ ...articleForm, content_type: v })}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="article"><FileText className="w-4 h-4 inline mr-2" />Статья</SelectItem>
                                            <SelectItem value="video"><Video className="w-4 h-4 inline mr-2" />Видео</SelectItem>
                                            <SelectItem value="infographic"><Image className="w-4 h-4 inline mr-2" />Инфографика</SelectItem>
                                            <SelectItem value="survey"><ClipboardList className="w-4 h-4 inline mr-2" />Опрос</SelectItem>
                                            <SelectItem value="document"><File className="w-4 h-4 inline mr-2" />Документ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Textarea
                                    value={articleForm.content}
                                    onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                                    placeholder="Описание или текст…"
                                    className="min-h-[72px] text-sm"
                                    data-testid="article-content-input"
                                />
                                <Input
                                    value={articleForm.video_url}
                                    onChange={(e) => setArticleForm({ ...articleForm, video_url: e.target.value })}
                                    placeholder="YouTube (воспроизведение на сайте)"
                                    className="text-sm h-9"
                                    data-testid="video-url-input"
                                />
                                <Input
                                    value={articleForm.image_url}
                                    onChange={(e) => setArticleForm({ ...articleForm, image_url: e.target.value })}
                                    placeholder="URL обложки (необязательно)"
                                    className="text-sm h-9"
                                    data-testid="image-url-input"
                                />
                                <div
                                    className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center hover:border-[#0051BA] transition-colors cursor-pointer"
                                    onDrop={handleDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    data-testid="file-upload-area"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov"
                                        onChange={(e) => handleFileUpload(e.target.files[0])}
                                    />
                                    {uploading ? (
                                        <div className="flex items-center justify-center gap-2 py-1">
                                            <Loader2 className="w-4 h-4 animate-spin text-[#0051BA]" />
                                            <span className="text-xs text-gray-500">Загрузка…</span>
                                        </div>
                                    ) : uploadedFile ? (
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {(() => { const Icon = getFileIcon(uploadedFile.name); return <Icon className="w-4 h-4 text-[#0051BA] shrink-0" />; })()}
                                                <span className="text-xs font-medium truncate">{uploadedFile.name}</span>
                                            </div>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); clearFile(); }} className="text-gray-400 hover:text-red-500 shrink-0">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-1">
                                            <Upload className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                                            <p className="text-xs text-gray-500">Файл PDF, DOCX, изображение, видео</p>
                                        </div>
                                    )}
                                </div>
                                <Button type="submit" className="w-full btn-primary h-9 text-sm" disabled={loading || uploading} data-testid="create-article-btn">
                                    <Plus className="w-4 h-4 mr-1" /> Опубликовать
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="xl:col-span-8 space-y-3">
                        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <CardContent className="p-4 space-y-3">
                                <div className="grid sm:grid-cols-3 gap-2">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск…" className="pl-9 h-9 text-sm" data-testid="library-search" />
                                    </div>
                                    <Select value={filterCat} onValueChange={setFilterCat}>
                                        <SelectTrigger className="h-9 text-sm" data-testid="library-filter-cat"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Все категории</SelectItem>
                                            <SelectItem value="technique">Техника</SelectItem>
                                            <SelectItem value="strategy">Стратегия</SelectItem>
                                            <SelectItem value="fitness">Фитнес</SelectItem>
                                            <SelectItem value="equipment">Экипировка</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={filterType} onValueChange={setFilterType}>
                                        <SelectTrigger className="h-9 text-sm" data-testid="library-filter-type"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {TYPE_FILTER.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-3">
                                    <div className="border border-gray-100 rounded-lg max-h-[440px] overflow-y-auto bg-white">
                                        {filteredArticles.map((article) => {
                                            const ytId = article.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
                                            const active = previewArticle?.id === article.id;
                                            const kind = getMaterialKind(article);
                                            return (
                                                <button
                                                    type="button"
                                                    key={article.id}
                                                    onClick={() => setPreviewArticle(article)}
                                                    className={`w-full text-left flex gap-2 p-2.5 border-b border-gray-50 last:border-0 transition-colors ${active ? 'bg-[#0051BA]/8' : 'hover:bg-gray-50'}`}
                                                    data-testid={`library-row-${article.id}`}
                                                >
                                                    <div className="w-14 h-10 rounded overflow-hidden shrink-0 bg-gray-200">
                                                        {ytId ? (
                                                            <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} alt="" className="w-full h-full object-cover" />
                                                        ) : article.image_url ? (
                                                            <img src={article.image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">{kind}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm truncate">{article.title}</div>
                                                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                                            <span className={`text-[10px] px-1.5 py-0 rounded ${categoryColors[article.category] || 'bg-gray-100 text-gray-700'}`}>
                                                                {article.category}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">{kind}</span>
                                                        </div>
                                                    </div>
                                                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-red-400 hover:text-red-600" onClick={(e) => handleDelete(article.id, e)} data-testid={`delete-article-${article.id}`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </button>
                                            );
                                        })}
                                        {filteredArticles.length === 0 && (
                                            <p className="text-sm text-gray-400 p-6 text-center">Ничего не найдено</p>
                                        )}
                                    </div>

                                    <div className="border border-gray-100 rounded-lg bg-slate-50 min-h-[280px] max-h-[440px] overflow-y-auto">
                                        {previewArticle ? (
                                            <div className="p-3 space-y-3">
                                                <div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded ${categoryColors[previewArticle.category] || 'bg-gray-100'}`}>
                                                        {previewArticle.category}
                                                    </span>
                                                    <h3 className="font-semibold text-sm mt-1">{previewArticle.title}</h3>
                                                    <p className="text-[10px] text-gray-400">Предпросмотр для игроков</p>
                                                </div>
                                                <MaterialMediaBody article={previewArticle} />
                                                <div className="prose prose-sm max-w-none border-t border-gray-200 pt-3">
                                                    {(previewArticle.content || '').split('\n').map((p, i) => (
                                                        p.trim() && <p key={i} className="text-xs text-gray-600 mb-1">{p}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 p-6 text-center">Выберите материал слева для предпросмотра</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {onClearContent && (
                            <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { if (window.confirm('Удалить все статьи и связанный контент?')) onClearContent(); }} data-testid="clear-content-btn">
                                <Trash2 className="w-3 h-3 mr-1" /> Очистить всю библиотеку
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </TabsContent>
    );
}
