// pdf-viewer/[id]/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { getUploadedPdf } from '@/store/pdf-slice';
import { useCustomToast } from '@/hooks/useCustomToast';
import PdfViewer from '@/components/PDF/PdfViewer';

export default function PdfViewerPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { showToast } = useCustomToast();
  const [pdfUrl, setPdfUrl] = useState(null);
  const searchParams = useSearchParams();


  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const result = await dispatch(getUploadedPdf({ uploadId: id, authToken: user?.token }));
        if (result.meta.requestStatus === 'fulfilled') {
          const payload = result.payload;
          // Convert base64 or byte array to Uint8Array
          const byteArray = new Uint8Array(payload.data); // or adapt based on how you receive data
          console.log('...byteArray', byteArray);

          // Create a blob
          // const blob = new Blob([byteArray], { type: 'application/pdf' });
          // const blobUrl = URL.createObjectURL(blob);
          // setPdfUrl(blobUrl);

          return () => URL.revokeObjectURL(blobUrl);
        } else {
          showToast({ title: 'Error', description: 'Failed to fetch PDF', variant: 'destructive' });
        }
      } catch (error) {
        console.error('Error fetching PDF:', error);
        showToast({ title: 'Error', description: 'Could not load the PDF.', variant: 'destructive' });
      }
    };

    if (id && user?.token) {
      fetchPdf();
    }
  }, [id, user?.token]);


  // const handlePdfClick = async () => {
  //   try {
  //     const result = await dispatch(getUploadedPdf({ uploadId: id, authToken: user?.token }));
  //     console.log('...result', result);

  //     if (result.meta.requestStatus === 'fulfilled') {
  //       const payload = result.payload;

  //       console.log("Raw payload from backend:", payload);

  //       // If payload is directly an array
  //       const byteArray = Array.isArray(payload) ? payload : payload?.data;

  //       if (!byteArray || byteArray.length === 0) {
  //         throw new Error("Empty PDF data received from backend.");
  //       }

  //       const uint8Array = new Uint8Array(byteArray);
  //       const blob = new Blob([uint8Array], { type: 'application/pdf' });
  //       const url = URL.createObjectURL(blob);

  //       const viewerUrl = `/pdf-viewer/${id}?pdf=${encodeURIComponent(url)}`;
  //       window.open(viewerUrl, '_blank');
  //     } else {
  //       showToast({
  //         title: "Error",
  //         description: "Failed to fetch PDF.",
  //         variant: "destructive",
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Error fetching PDF:', error);
  //     showToast({
  //       title: "Error",
  //       description: error.message || "Could not load the PDF.",
  //       variant: "destructive",
  //     });
  //   }
  // };


  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
          <div className="w-12 h-12 animate-spin text-gray-400" />
          <p className="text-sm font-medium text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return <PdfViewer pdfUrl={pdfUrl} />;
}