import { memo, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GLOSSARY, GLOSSARY_REGEX } from "@/lib/glossary";

interface Props {
  text: string;
  className?: string;
}

/**
 * Renders text with glossary terms underlined and tooltipped.
 * Only active when beginner mode is on (caller decides whether to use this).
 */
const GlossaryText = memo(({ text, className }: Props) => {
  const parts = useMemo(() => {
    const result: { text: string; isTerm: boolean }[] = [];
    let lastIndex = 0;

    // Reset regex state
    GLOSSARY_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = GLOSSARY_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ text: text.slice(lastIndex, match.index), isTerm: false });
      }
      result.push({ text: match[0], isTerm: true });
      lastIndex = GLOSSARY_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), isTerm: false });
    }

    return result;
  }, [text]);

  // No terms found — render plain
  if (parts.length <= 1 && !parts[0]?.isTerm) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <span className={className}>
        {parts.map((part, i) =>
          part.isTerm ? (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span className="border-b border-dashed border-primary/60 cursor-help text-primary/90 hover:text-primary transition-colors">
                  {part.text}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs text-xs font-mono leading-relaxed bg-popover border-primary/30"
              >
                <p className="font-bold text-primary mb-1">{GLOSSARY[part.text]?.term}</p>
                <p className="text-popover-foreground">{GLOSSARY[part.text]?.definition}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </span>
    </TooltipProvider>
  );
});

GlossaryText.displayName = "GlossaryText";

export default GlossaryText;
