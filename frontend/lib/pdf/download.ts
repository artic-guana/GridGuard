import React from 'react';
import { ConsumerDetail, DTScore, ConsumerScore } from './helpers';
import { ConsumerReport } from './ConsumerReport';
import { TransformerReport } from './TransformerReport';

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (!blob || blob.size === 0) {
    throw new Error('Generated PDF blob is empty.');
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);

  requestAnimationFrame(() => {
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1200);
  });
}

export async function downloadConsumerPdf(
  detail: ConsumerDetail,
  features?: Record<string, unknown>
): Promise<void> {
  const { pdf } = await import('@react-pdf/renderer');

  const featMap = features || detail.features || {};
  const element = React.createElement(ConsumerReport, {
    detail,
    features: featMap,
  }) as React.ReactElement<any>;

  const instance = pdf(element);
  const blob = await instance.toBlob();

  const now = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const filename = `Report_Consumer_${detail.CONS_NO}_${now}.pdf`;

  triggerBlobDownload(blob, filename);
}

export async function downloadTransformerPdf(
  dt: DTScore,
  consumers: ConsumerScore[]
): Promise<void> {
  const { pdf } = await import('@react-pdf/renderer');

  const element = React.createElement(TransformerReport, {
    dt,
    consumers,
  }) as React.ReactElement<any>;

  const instance = pdf(element);
  const blob = await instance.toBlob();

  const now = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const filename = `Report_Transformer_${dt.dt_id}_${now}.pdf`;

  triggerBlobDownload(blob, filename);
}
