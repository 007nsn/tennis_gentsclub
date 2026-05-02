import { useMemo, useState } from 'react';
import { TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { FileText, Image as ImageIcon, Video, File, Search, Download, ExternalLink } from 'lucide-react';
import { getFileUrl } from '../../lib/api';

function getFileType(article) {
    const name = (article.file_name || '').toLowerCase();
    if (article.video_url) return 'external-video';
    if (!name) return 'article';
    if (/\.(mp4|webm|mov)$/i.test(name)) return 'video';
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(name)) return 'image';
    if (/\.pdf$/i.test(name)) return 'pdf';
    if (/\.(doc|docx|ppt|pptx|txt)$/i.test(name)) return 'doc';
    return 'file';
}

function MediaIcon({ type }) {
    if (type === 'video' || type === 'external-video') return <Video className="w-4 h-4" />;
    if (type === 'image') return <ImageIcon className="w-4 h-4" />;
    if (type === 'pdf' || type === 'doc') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
}

export function AdminMediaCenterTab({ articles = [] }) {
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedId, setSelectedId] = useState(null);

    const assets = useMemo(() => {
        const mapped = articles
            .filter((a) => a.file_name || a.file_path || a.video_url)
            .map((a) => ({ ...a, mediaType: getFileType(a) }));

        return mapped
            .filter((a) => {
                const matchesType = typeFilter === 'all' || a.mediaType === typeFilter;
                const haystack = `${a.title || ''} ${a.file_name || ''} ${a.category || ''}`.toLowerCase();
                const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase());
                return matchesType && matchesQuery;
            })
            .sort((a, b) => {
                if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '');
                if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
                return new Date(b.created_at) - new Date(a.created_at);
            });
    }, [articles, query, typeFilter, sortBy]);

    const selected = assets.find((a) => a.id === selectedId) || assets[0];
    const selectedFileUrl = selected?.file_path ? getFileUrl(selected.file_path) : null;

    return (
        <TabsContent value="media-center">
            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Media Center</CardTitle>
                        <CardDescription>Browse uploaded and linked media assets</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search title or file"
                                    className="pl-9"
                                    data-testid="media-search-input"
                                />
                            </div>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger data-testid="media-type-filter"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="external-video">External Video</SelectItem>
                                    <SelectItem value="pdf">PDF</SelectItem>
                                    <SelectItem value="doc">Docs</SelectItem>
                                    <SelectItem value="image">Images</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger data-testid="media-sort-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="oldest">Oldest</SelectItem>
                                    <SelectItem value="name">Name</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                            {assets.map((asset) => (
                                <button
                                    type="button"
                                    key={asset.id}
                                    onClick={() => setSelectedId(asset.id)}
                                    className={`text-left p-3 rounded-lg border transition-colors ${
                                        selected?.id === asset.id ? 'border-[#0051BA] bg-[#0051BA]/5' : 'border-gray-100 hover:border-gray-300'
                                    }`}
                                    data-testid={`media-asset-${asset.id}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <MediaIcon type={asset.mediaType} />
                                            <p className="font-medium text-sm truncate">{asset.title}</p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">{asset.mediaType}</Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{asset.file_name || asset.video_url || 'Linked content'}</p>
                                </button>
                            ))}
                            {assets.length === 0 && <p className="text-sm text-gray-400">No assets found.</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardHeader>
                        <CardTitle>Asset Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!selected ? (
                            <p className="text-sm text-gray-400">Select an asset to inspect.</p>
                        ) : (
                            <>
                                <p className="font-medium text-sm">{selected.title}</p>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p>Category: {selected.category}</p>
                                    <p>Type: {selected.mediaType}</p>
                                    <p>File: {selected.file_name || 'N/A'}</p>
                                </div>
                                {selected.mediaType === 'external-video' && selected.video_url && (
                                    <a href={selected.video_url} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline" className="w-full">
                                            <ExternalLink className="w-4 h-4 mr-1" /> Open Link
                                        </Button>
                                    </a>
                                )}
                                {selectedFileUrl && (
                                    <a href={selectedFileUrl} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" className="w-full bg-[#0051BA]">
                                            <Download className="w-4 h-4 mr-1" /> Open/Download
                                        </Button>
                                    </a>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
    );
}

