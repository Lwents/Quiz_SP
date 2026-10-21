import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import { resolveMediaUrl } from '../api/urls';
import { MathText } from './MathText';

interface QuestionContentProps {
  content: string;
  imageUrl?: string;
  className?: string;
}

const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(((?:https?:\/\/|\/media\/)[^\s)]+)\)/g;

const ImageViewer: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  return createPortal(
    <dialog ref={dialog} aria-label="Xem ảnh câu hỏi" onCancel={onClose} onClose={onClose}
      className="fixed inset-0 m-auto h-dvh max-h-dvh w-screen max-w-full border-0 bg-slate-950 p-0 text-white backdrop:bg-black/80">
      <div className="flex h-full min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <span className="min-w-0 flex-1 truncate text-sm">{alt}</span>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label="Thu nhỏ ảnh" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/15 disabled:opacity-30"><Minus className="h-5 w-5" /></button>
            <span aria-live="polite" className="w-12 text-center text-xs">{zoom * 100}%</span>
            <button type="button" aria-label="Phóng to ảnh" disabled={zoom >= 4} onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/15 disabled:opacity-30"><Plus className="h-5 w-5" /></button>
            <button type="button" aria-label="Đóng ảnh" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/15"><X className="h-6 w-6" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3">
          <div className={zoom === 1 ? 'flex h-full items-center justify-center' : ''} style={zoom > 1 ? { width: `${zoom * 100}%` } : undefined}>
            <img src={src} alt={alt} className={zoom === 1 ? 'max-h-full max-w-full rounded bg-white object-contain' : 'h-auto w-full max-w-none rounded bg-white'} />
          </div>
        </div>
        <p className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-slate-300">Dùng + / − để phóng to, vuốt để xem chi tiết ảnh.</p>
      </div>
    </dialog>, document.body,
  );
};

const QuestionImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = resolveMediaUrl(src);
  return <figure className="my-4 min-w-0 max-w-full sm:my-5">
    <button type="button" aria-label={`Phóng to: ${alt}`} onClick={() => setOpen(true)} disabled={failed || !url}
      className="group relative mx-auto block max-w-full cursor-zoom-in rounded-xl border border-slate-200 bg-white p-1 shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-default">
      <img src={url || undefined} alt={alt} loading="lazy" decoding="async" onLoad={() => setFailed(false)} onError={() => setFailed(true)}
        className="mx-auto block h-auto max-h-[28rem] max-w-full rounded-lg object-contain" />
      {!failed && <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 text-[11px] font-normal text-white"><Maximize2 className="h-3.5 w-3.5" />Phóng to</span>}
    </button>
    {failed && <p className="mt-2 text-center text-xs font-normal text-rose-700">Không tải được hình minh họa. Hãy kiểm tra kết nối rồi tải lại trang.</p>}
    {open && <ImageViewer src={url} alt={alt} onClose={() => setOpen(false)} />}
  </figure>;
};

/** Render text and illustrations without accepting unsafe HTML. */
export const QuestionContent: React.FC<QuestionContentProps> = ({ content, imageUrl, className = '' }) => {
  const children: React.ReactNode[] = [];
  const hasConfigImage = Boolean(imageUrl && resolveMediaUrl(imageUrl));
  const text = hasConfigImage ? content.replace(MARKDOWN_IMAGE, '') : content;
  let lastIndex = 0;
  let imageCount = 0;
  MARKDOWN_IMAGE.lastIndex = 0;
  for (const match of text.matchAll(MARKDOWN_IMAGE)) {
    if (match.index > lastIndex) children.push(<span key={`text-${lastIndex}`} className="whitespace-pre-wrap"><MathText text={text.slice(lastIndex, match.index)} /></span>);
    children.push(<QuestionImage key={`image-${imageCount++}-${match[2]}`} src={match[2]} alt={match[1] || 'Hình minh họa câu hỏi'} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) children.push(<span key={`text-${lastIndex}`} className="whitespace-pre-wrap"><MathText text={text.slice(lastIndex)} /></span>);
  if (hasConfigImage) children.push(<QuestionImage key={imageUrl} src={imageUrl!} alt="Hình minh họa câu hỏi" />);
  return <div className={`min-w-0 max-w-full [overflow-wrap:anywhere] ${className}`}>{children}</div>;
};
