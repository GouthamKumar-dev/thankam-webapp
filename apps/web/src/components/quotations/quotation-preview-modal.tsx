import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Share2,
  Printer,
  X,
  FileText,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateQuoteHtml, downloadQuotePdf, PdfQuoteInput } from '@/utils/quote-pdf';
import { quotationsService } from '@/features/quotations/quotations.service';

export type QuotationPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pdfInput: PdfQuoteInput | null;
  quotationId?: string;
  quotationNumber?: string;
  customerPhone?: string;
  customerName?: string;
  isCustomerPortal?: boolean;
};

export function QuotationPreviewModal({
  isOpen,
  onClose,
  pdfInput,
  quotationId,
  quotationNumber = pdfInput?.quotationNumber || 'QUO',
  customerPhone = pdfInput?.customerPhone,
  customerName = pdfInput?.customerName,
  isCustomerPortal = false,
}: QuotationPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background page scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Reset copied state when share menu opens
  useEffect(() => {
    if (!shareMenuOpen) setCopied(false);
  }, [shareMenuOpen]);

  if (!isOpen || !pdfInput) return null;

  const quoteHtml = generateQuoteHtml(pdfInput);

  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/customer/track?quote=${encodeURIComponent(quotationNumber)}`
    : '';

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (quotationId) {
        try {
          if (isCustomerPortal) {
            await quotationsService.downloadPortalPdf(
              quotationId,
              `Quotation-${quotationNumber}.pdf`,
            );
          } else {
            await quotationsService.downloadPdf(
              quotationId,
              `Quotation-${quotationNumber}.pdf`,
            );
          }
          toast.success('Official PDF proposal downloaded');
          return;
        } catch (serverErr) {
          console.warn('Backend PDF download fallback to client generator', serverErr);
        }
      }

      await downloadQuotePdf(pdfInput);
      toast.success('Quotation PDF downloaded successfully');
    } catch (err) {
      console.error('Failed to download quotation PDF', err);
      toast.error('Could not download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Iframe print fallback to window print', e);
      window.print();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      toast.success('Quotation link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Clipboard copy failed', e);
      toast.error('Unable to copy link to clipboard');
    }
  };

  const handleWhatsAppShare = () => {
    let cleanPhone = (customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const shareMsg = `🌟 *Thankam Events Management*
Hello ${customerName || 'Valued Guest'}, here is your official Catering & Events Quotation (*${quotationNumber}*):

🔗 *View & Track Quotation:*
${trackingUrl}

_Celebrations Crafted • Central Kitchen, Kollam_`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareMsg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMsg)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setShareMenuOpen(false);
    toast.success('Opening WhatsApp to share quotation...');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Quotation ${quotationNumber} - Thankam Events`,
          text: `Official Catering & Events Quotation for ${customerName || 'Valued Guest'}`,
          url: trackingUrl,
        });
        setShareMenuOpen(false);
        toast.success('Quotation shared successfully');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed, falling back to copy link', err);
          void handleCopyLink();
        }
      }
    } else {
      void handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-1.5 sm:p-3 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl xl:max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 flex flex-col h-[98vh] max-h-[98vh]">
        {/* Modal Controls Bar */}
        <div className="print:hidden shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-slate-200 text-slate-900 z-20">
          {/* Title & Metadata */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                  Quotation Proposal Preview
                </h3>
                <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  {quotationNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                Customer: <span className="font-medium text-slate-700">{customerName || 'Valued Guest'}</span>
                {customerPhone ? ` • ${customerPhone}` : ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 relative">
            {/* Share Popover Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShareMenuOpen(!shareMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
                title="Share quotation"
              >
                <Share2 size={13} className="text-amber-600" />
                <span>Share</span>
              </button>

              {shareMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShareMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-40 text-xs space-y-1">
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                    >
                      <MessageCircle size={15} className="text-emerald-600" />
                      <span>Share on WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopyLink()}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                    >
                      {copied ? (
                        <Check size={15} className="text-emerald-600" />
                      ) : (
                        <Copy size={15} className="text-amber-600" />
                      )}
                      <span>{copied ? 'Link Copied!' : 'Copy Portal Link'}</span>
                    </button>

                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        type="button"
                        onClick={() => void handleNativeShare()}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <ExternalLink size={15} className="text-slate-500" />
                        <span>More Share Options...</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
              title="Print document"
            >
              <Printer size={13} className="text-slate-600" />
              <span>Print</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] hover:brightness-105 text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            >
              {downloading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Download size={13} />
              )}
              <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body - Paper Canvas with Iframe */}
        <div className="bg-slate-100 p-2 sm:p-3 overflow-hidden flex-1 min-h-0 flex justify-center items-stretch">
          <div className="w-full max-w-[880px] bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200/90 h-full flex flex-col">
            <iframe
              ref={iframeRef}
              srcDoc={quoteHtml}
              title={`Quotation Preview ${quotationNumber}`}
              className="w-full h-full border-0 block flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
