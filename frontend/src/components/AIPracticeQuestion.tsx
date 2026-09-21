import React, { useState } from 'react';
import { CheckCircle2, XCircle, Sparkles, ArrowRight, RotateCcw, Lightbulb } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface AIPracticeOption {
  id: string;
  text: string;
}

export interface AIPracticeData {
  question: string;
  options: AIPracticeOption[];
  correct: string;
  explanation: string;
}

interface AIPracticeQuestionProps {
  data: AIPracticeData;
}

const renderKatexSafe = (formula: string): string => {
  try {
    return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
  } catch {
    return formula;
  }
};

const renderMathInString = (text: string): React.ReactNode => {
  // Replace inline math $...$ and bare LaTeX commands
  const parts = text.split(/(\$[^\$\n]+?\$|`.*?`|\*\*.*?\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const math = part.slice(1, -1);
      const html = renderKatexSafe(math);
      return (
        <span
          key={idx}
          className="inline-block px-0.5 mx-0.5 text-indigo-950 font-medium align-baseline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Check for bare LaTeX commands like \forall, \exists, \rightarrow, \mathbb{Z}
    const subParts = part.split(/(\\[a-zA-Z]+(?:\{[^{}]*\})?)/g);
    return subParts.map((sp, spIdx) => {
      if (/^\\[a-zA-Z]+/.test(sp)) {
        try {
          const html = katex.renderToString(sp, { throwOnError: true });
          return (
            <span
              key={`${idx}-${spIdx}`}
              className="inline-block px-0.5 text-indigo-950 font-medium align-baseline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return sp;
        }
      }
      return sp;
    });
  });
};

export const AIPracticeQuestion: React.FC<AIPracticeQuestionProps> = ({ data }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const isCorrect = selectedOption === data.correct;

  const handleSelect = (optId: string) => {
    if (hasSubmitted) return;
    setSelectedOption(optId);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setHasSubmitted(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setHasSubmitted(false);
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-b from-indigo-50/60 via-white to-blue-50/40 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs sm:text-sm">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span>Thử thách củng cố: Bạn hãy chọn đáp án đúng!</span>
        </div>
        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
          Gia sư AI gợi ý
        </span>
      </div>

      {/* Question text */}
      <div className="text-sm font-semibold text-slate-900 leading-relaxed">
        {renderMathInString(data.question)}
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {data.options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          const isThisCorrect = opt.id === data.correct;

          let btnStyle = 'border-slate-200/80 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-800';

          if (hasSubmitted) {
            if (isThisCorrect) {
              btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 font-semibold';
            } else if (isSelected && !isThisCorrect) {
              btnStyle = 'border-rose-400 bg-rose-50 text-rose-900 line-through';
            } else {
              btnStyle = 'border-slate-200 bg-slate-50/60 text-slate-400 opacity-60';
            }
          } else if (isSelected) {
            btnStyle = 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 font-semibold';
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={hasSubmitted}
              onClick={() => handleSelect(opt.id)}
              className={`p-3 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center gap-3 cursor-pointer ${btnStyle}`}
            >
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                hasSubmitted && isThisCorrect
                  ? 'bg-emerald-600 text-white'
                  : hasSubmitted && isSelected && !isThisCorrect
                  ? 'bg-rose-500 text-white'
                  : isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {opt.id}
              </span>
              <span className="flex-1 min-w-0">{renderMathInString(opt.text)}</span>
            </button>
          );
        })}
      </div>

      {/* Submit / Reset Footer */}
      {!hasSubmitted ? (
        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            disabled={!selectedOption}
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Kiểm tra đáp án</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className={`p-4 rounded-xl border space-y-2 animate-in fade-in duration-200 ${
          isCorrect ? 'bg-emerald-50/90 border-emerald-200' : 'bg-rose-50/90 border-rose-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-900">Tuyệt vời! Bạn đã trả lời hoàn toàn chính xác! 🎉</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <span className="text-rose-900">
                    Chưa chính xác! Đáp án đúng là <strong>{data.correct}</strong>
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 p-1 hover:bg-white/60 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Thử lại</span>
            </button>
          </div>

          <div className="text-xs leading-relaxed text-slate-700 pl-7">
            <span className="font-semibold text-slate-800">Giải thích: </span>
            {renderMathInString(data.explanation)}
          </div>
        </div>
      )}
    </div>
  );
};
