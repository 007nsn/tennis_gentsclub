import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
    getYouTubeId,
    isPdf,
    isDocx,
    isDocLegacy,
    isPptx,
    isImage,
    isVideoFile,
    isTxt,
} from '../lib/educationMedia';

/**
 * In-site media only: YouTube embed, PDF/image/video via authenticated blob URL, DOCX via docx-preview.
 * No download actions. Private files use blob URLs so auth headers work (cookies / Bearer).
 */
export function MaterialMediaBody({ article, youtubeAutoplay = false }) {
    const { user } = useAuth();
    const docxRef = useRef(null);
    const [blobUrl, setBlobUrl] = useState(null);
    /** undefined = not loaded yet for .txt */
    const [textFileContent, setTextFileContent] = useState(undefined);
    const [docxReady, setDocxReady] = useState(false);
    const [error, setError] = useState(null);

    const youtubeId = getYouTubeId(article?.video_url);
    const path = article?.file_path;
    const fileName = article?.file_name || '';

    useEffect(() => {
        const revoked = [];
        let cancelled = false;
        setError(null);
        setTextFileContent(undefined);
        setBlobUrl(null);
        setDocxReady(false);

        if (docxRef.current) {
            docxRef.current.innerHTML = '';
        }

        if (!path || !user || youtubeId) {
            return () => revoked.forEach((u) => URL.revokeObjectURL(u));
        }

        if (isPptx(fileName) || isDocLegacy(fileName)) {
            return () => revoked.forEach((u) => URL.revokeObjectURL(u));
        }

        (async () => {
            try {
                if (isDocx(fileName)) {
                    const res = await api.get(`/files/${path}`, { responseType: 'arraybuffer' });
                    if (cancelled || !docxRef.current) return;
                    await renderAsync(res.data, docxRef.current, null, {
                        className: 'docx-preview-doc',
                        inWrapper: true,
                    });
                    if (!cancelled) setDocxReady(true);
                    return;
                }

                if (isTxt(fileName)) {
                    const res = await api.get(`/files/${path}`, { responseType: 'text' });
                    if (!cancelled) setTextFileContent(res.data);
                    return;
                }

                if (isPdf(fileName) || isVideoFile(fileName) || isImage(fileName)) {
                    const res = await api.get(`/files/${path}`, { responseType: 'blob' });
                    if (cancelled) return;
                    const url = URL.createObjectURL(res.data);
                    revoked.push(url);
                    setBlobUrl(url);
                }
            } catch (e) {
                if (!cancelled) setError('Не удалось загрузить файл для просмотра. Войдите в аккаунт и попробуйте снова.');
            }
        })();

        return () => {
            cancelled = true;
            revoked.forEach((u) => URL.revokeObjectURL(u));
        };
    }, [article?.id, path, fileName, user, youtubeId]);

    if (!user) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Войдите, чтобы просматривать материалы клуба внутри сайта.
            </div>
        );
    }

    if (error) {
        return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
    }

    if (youtubeId) {
        const src = `https://www.youtube.com/embed/${youtubeId}${youtubeAutoplay ? '?autoplay=1' : ''}`;
        return (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                    src={src}
                    title={article.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        );
    }

    if (path && isDocLegacy(fileName)) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Формат .doc в браузере не открывается. Загрузите, пожалуйста, <strong>.docx</strong> или <strong>PDF</strong>.
            </div>
        );
    }

    if (path && isPptx(fileName)) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Показ слайдов (PPT/PPTX) внутри приложения недоступен. Для просмотра в клубе добавьте экспорт в{' '}
                <strong>PDF</strong>.
            </div>
        );
    }

    if (path && isDocx(fileName)) {
        return (
            <div className="bg-white rounded-lg border border-gray-100 overflow-auto max-h-[70vh] p-4 docx-preview-root relative">
                {!docxReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 bg-white/80 z-10">
                        Загрузка документа…
                    </div>
                )}
                <div ref={docxRef} />
            </div>
        );
    }

    if (path && isTxt(fileName)) {
        if (textFileContent === undefined) {
            return (
                <div className="flex justify-center bg-slate-50 rounded-lg p-8 text-sm text-gray-500">Загрузка текста…</div>
            );
        }
        return (
            <div className="bg-slate-50 rounded-lg border border-gray-100 p-4 max-h-[70vh] overflow-auto">
                <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">{textFileContent}</pre>
            </div>
        );
    }

    if (blobUrl && isPdf(fileName)) {
        return (
            <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                <iframe title={fileName} src={blobUrl} className="w-full h-full border-0" />
            </div>
        );
    }

    if (blobUrl && isVideoFile(fileName)) {
        return (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video controls className="w-full h-full" preload="metadata" controlsList="nodownload">
                    <source src={blobUrl} type={article.file_content_type || 'video/mp4'} />
                </video>
            </div>
        );
    }

    if (blobUrl && isImage(fileName)) {
        return (
            <div className="flex justify-center bg-slate-50 rounded-lg border border-gray-100 p-4">
                <img src={blobUrl} alt={fileName} className="max-w-full max-h-[60vh] object-contain rounded" />
            </div>
        );
    }

    if (!path && article?.image_url) {
        return (
            <div className="flex justify-center bg-slate-50 rounded-lg border border-gray-100 overflow-hidden">
                <img src={article.image_url} alt={article.title} className="max-w-full max-h-[55vh] object-contain" />
            </div>
        );
    }

    if (path && isImage(fileName) && !blobUrl && !error) {
        return (
            <div className="flex justify-center bg-slate-50 rounded-lg p-8 text-sm text-gray-500">Загрузка изображения…</div>
        );
    }

    if (path && (isPdf(fileName) || isVideoFile(fileName)) && !blobUrl && !error) {
        return (
            <div className="flex justify-center bg-slate-50 rounded-lg p-8 text-sm text-gray-500">Загрузка файла…</div>
        );
    }

    return null;
}
