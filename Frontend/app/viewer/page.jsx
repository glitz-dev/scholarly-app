"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

export default function Viewer() {
  const viewerRef = useRef(null);
  const initialized = useRef(false);
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uploadId || initialized.current) return;
    initialized.current = true;

    (async () => {           
      setLoading(true);
      const WebViewer = (await import("@pdftron/webviewer")).default;

      WebViewer({ path: "/webviewer", licenseKey: 'demo:1755081375057:6190382203000000007ff1a4713d5bc127a91e603b455b8879682cc622', }, viewerRef.current).then((instance) => {
        instance.UI.loadDocument(`/api/PDF/getuploadedpdf?uploadId=${uploadId}`, {
          filename: "document.pdf",
          customHeaders: { Authorization: `Bearer ${user?.token}` }
        });

        instance.Core.documentViewer.addEventListener("documentLoaded", () => {             
          setLoading(false);
        });
      });
    })();
  }, [uploadId, user]);

  return (
    <div style={{ height: "100vh", position: "relative" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.8)",              
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div className="loader"></div>
        </div>
      )}
      <div ref={viewerRef} style={{ height: "100%" }}></div>

      <style jsx>{`
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
