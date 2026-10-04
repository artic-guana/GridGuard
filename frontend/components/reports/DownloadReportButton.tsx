'use client';

import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { downloadConsumerPdf, downloadTransformerPdf } from '@/lib/pdf/download';
import { ConsumerDetail, DTScore, ConsumerScore } from '@/lib/pdf/helpers';

export interface ConsumerPayload extends ConsumerDetail {}

export interface TransformerPayload {
  dt: DTScore;
  consumers: ConsumerScore[];
}

export interface DownloadReportButtonProps {
  kind: 'consumer' | 'transformer';
  payload: ConsumerPayload | TransformerPayload;
  label?: string;
  className?: string;
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  kind,
  payload,
  label,
  className,
}) => {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');

  const handleDownload = async () => {
    if (status === 'generating') return;

    try {
      setStatus('generating');

      if (kind === 'consumer') {
        const consumerPayload = payload as ConsumerPayload;
        await downloadConsumerPdf(consumerPayload, consumerPayload.features);
      } else {
        const transformerPayload = payload as TransformerPayload;
        await downloadTransformerPdf(transformerPayload.dt, transformerPayload.consumers || []);
      }

      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('PDF Generation Failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const defaultLabel = label || (kind === 'consumer' ? 'Download PDF Report' : 'Download DT Report');

  return (
    <button
      onClick={handleDownload}
      disabled={status === 'generating'}
      className={
        className ||
        'flex items-center gap-2 bg-navy-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed bg-slate-900'
      }
      title="Generate downloadable PDF audit report"
    >
      {status === 'generating' && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />}
      {status === 'idle' && <Download className="w-3.5 h-3.5 text-slate-200" />}
      {status === 'done' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
      {status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}

      <span>
        {status === 'generating'
          ? 'Generating PDF...'
          : status === 'done'
          ? 'Downloaded!'
          : status === 'error'
          ? 'Failed — Retry'
          : defaultLabel}
      </span>
    </button>
  );
};

export default DownloadReportButton;
