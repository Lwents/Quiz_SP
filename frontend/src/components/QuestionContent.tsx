import React from 'react';

interface QuestionContentProps {
  content: string;
  /** Optional image URL stored separately in a question config. */
  imageUrl?: string;
  className?: string;
}

const MARKDOWN_IMAGE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

/**
 * Renders question text without using unsafe HTML.  The question bank stores
 * images as Markdown (`![alt](https://...)`) and some imported questions keep
 * the image URL in `config.image_url`, so both representations are supported.
 */
export const QuestionContent: React.FC<QuestionContentProps> = ({
  content,
  imageUrl,
  className = '',
}) => {
  const children: React.ReactNode[] = [];
  // A locally uploaded image is the deliberate, current illustration chosen
  // by the teacher. It therefore takes precedence over legacy Markdown URLs.
  const hasConfigImage = Boolean(imageUrl && /^https?:\/\//i.test(imageUrl));
  const contentToRender = hasConfigImage ? content.replace(MARKDOWN_IMAGE, '') : content;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let imageCount = 0;

  if (hasConfigImage) {
    children.push(
      <figure key="config-image" className="my-5 flex justify-center">
        <img
          src={imageUrl}
          alt="Hình minh họa câu hỏi"
          loading="lazy"
          decoding="async"
          className="max-h-[28rem] max-w-full rounded-xl border border-slate-200 bg-slate-50 object-contain shadow-sm"
        />
      </figure>
    );
  }

  MARKDOWN_IMAGE.lastIndex = 0;
  while ((match = MARKDOWN_IMAGE.exec(contentToRender)) !== null) {
    if (match.index > lastIndex) {
      children.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {contentToRender.slice(lastIndex, match.index)}
        </span>
      );
    }

    children.push(
      <figure key={`image-${imageCount++}`} className="my-5 flex justify-center">
        <img
          src={match[2]}
          alt={match[1] || 'Hình minh họa câu hỏi'}
          loading="lazy"
          decoding="async"
          className="max-h-[28rem] max-w-full rounded-xl border border-slate-200 bg-slate-50 object-contain shadow-sm"
        />
      </figure>
    );
    lastIndex = MARKDOWN_IMAGE.lastIndex;
  }

  if (lastIndex < contentToRender.length) {
    children.push(
      <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
        {contentToRender.slice(lastIndex)}
      </span>
    );
  }

  if (!hasConfigImage && imageUrl && imageCount === 0 && /^https?:\/\//i.test(imageUrl)) {
    children.push(
      <figure key="config-image" className="my-5 flex justify-center">
        <img
          src={imageUrl}
          alt="Hình minh họa câu hỏi"
          loading="lazy"
          decoding="async"
          className="max-h-[28rem] max-w-full rounded-xl border border-slate-200 bg-slate-50 object-contain shadow-sm"
        />
      </figure>
    );
  }

  return <div className={className}>{children}</div>;
};
