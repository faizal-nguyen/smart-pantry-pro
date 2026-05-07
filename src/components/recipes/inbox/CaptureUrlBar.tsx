import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CaptureUrlBarProps {
  /** Called with the trimmed URL on submit. May reject; the form
   * displays a red helper text and clears it on the next keystroke. */
  onCapture: (url: string) => Promise<unknown> | void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Inline URL capture bar (PRP-220.12). Validates that the input parses
 * as a URL before submitting; trims trailing whitespace and clears on
 * success.
 */
export const CaptureUrlBar: React.FC<CaptureUrlBarProps> = ({
  onCapture,
  className,
  placeholder = 'Colle une URL Instagram, TikTok ou YouTube…',
  disabled,
}) => {
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLikelyUrl = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed) return false;
    try {
      const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      return Boolean(u.hostname);
    } catch {
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const url = value.trim();
    if (!url) return;
    if (!isLikelyUrl(url)) {
      setError("L'URL ne semble pas valide.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onCapture(url.startsWith('http') ? url : `https://${url}`);
      setValue('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Échec de la capture');
    } finally {
      setPending(false);
    }
  };

  const isDisabled = disabled || pending;

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div className="flex items-stretch gap-2">
        <Input
          type="url"
          inputMode="url"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          aria-label="URL à capturer"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'capture-url-error' : undefined}
          disabled={isDisabled}
          className="flex-1"
        />
        <Button type="submit" disabled={isDisabled || !value.trim()}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              Capture…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1.5" />
              Capturer
            </>
          )}
        </Button>
      </div>
      {error && (
        <p
          id="capture-url-error"
          role="alert"
          className="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </form>
  );
};

export default CaptureUrlBar;
