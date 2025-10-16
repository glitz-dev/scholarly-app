'use client';
import React, { useCallback, useState, useRef } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, FileText, Link, User, Hash, Calendar, ExternalLink, Lock, Globe, Copyright, Book, EyeOff, Eye } from 'lucide-react';
import CustomButton from '@/common/CustomButton';
import * as pdfjsLib from 'pdfjs-dist';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

// Set up pdf.js worker to use local ESM file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// --- Helper to search Crossref for DOI ---
async function findDOIFromCrossref(title, author) {
  try {
    const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&query.author=${encodeURIComponent(author)}&rows=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.message?.items?.length) {
      return data.message.items[0].DOI || '';
    }
  } catch (err) {
    console.error('Crossref lookup failed:', err);
  }
  return '';
}

// --- Helper to search PubMed for PMID ---
async function findPMIDFromPubMed(title, author) {
  try {
    const term = `${title}[Title] AND ${author}[Author]`;
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmode=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.esearchresult?.idlist?.length) {
      return data.esearchresult.idlist[0] || '';
    }
  } catch (err) {
    console.error('PubMed lookup failed:', err);
  }
  return '';
}

const UploadPdf = ({
  setFile,
  fileUrl,
  setFileUrl,
  formData,
  setFormData,
  isSubmitting,
  fileInputRef,
  handleUploadCollection,
  isFirstCollection,
  selectedProjectId,
  projects
}) => {
  const [uploadType, setUploadType] = useState('file');
  const [dragActive, setDragActive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [fileError, setFileError] = useState('');
  const [doiTouched, setDoiTouched] = useState(false);
  const [pmidTouched, setPmidTouched] = useState(false);
  const [extractionErrors, setExtractionErrors] = useState({
    doi: false,
    pubmedid: false,
    article: false,
    author: false,
    access: false,
    copyright: false,
    publisher: false,
  });
  const dialogCloseRef = useRef(null); // Internal ref for DialogClose

  const isMobile = typeof window !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  function isValidDOI(doi) {
    const doiRegex = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
    return doiRegex.test(doi.trim());
  }

  function isValidPMID(pmid) {
    const pmidRegex = /^\d{7,8}$/;
    return pmidRegex.test(pmid.trim());
  }

  const isButtonDisabled =
    isSubmitting ||
    (!formData?.url?.trim() && !formData?.file) ||
    (extractionErrors.doi && doiTouched); // Disable if DOI is invalid after touch

  const extractMetadataFromPDF = async (file) => {
    try {
      setIsExtracting(true);
      setExtractionErrors({ doi: false, pubmedid: false, article: false, author: false, access: false, copyright: false, publisher: false });

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let doi = '';
      let pubmedId = '';
      let title = '';
      let author = '';
      let access = '';
      let copyright = '';
      let publisher = '';

      // --- Step 1: Metadata ---
      const metadata = await pdf.getMetadata();
      if (metadata.info) {
        const metadataStr = JSON.stringify(metadata.info).toLowerCase();
        const doiMatch = metadataStr.match(/(?:https?:\/\/doi\.org\/)?(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i);
        if (doiMatch) doi = doiMatch[1];
        const pubmedMatch = metadataStr.match(/(?:pmid:|pubmed:)?(\b\d{7,8}\b)/i);
        if (pubmedMatch) pubmedId = pubmedMatch[1];
        title = metadata.info.Title || '';
        author = metadata.info.Author || '';
        publisher = metadata.info.Publisher || '';
        copyright = metadata.info.Copyright || metadata.info.CopyrightStatus || '';
      }

      // --- Step 2: Visible text scan ---
      if (!doi || !pubmedId || !title || !author || !access || !copyright || !publisher) {
        let textContent = '';
        for (let i = 1; i <= (doi || pubmedId ? 1 : pdf.numPages); i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map((item) => item.str).join(' ') + ' ';
        }

        if (!doi) {
          const doiMatch = textContent.match(/(?:https?:\/\/doi\.org\/)?(10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+)/i);
          if (doiMatch) doi = doiMatch[1];
        }

        if (!pubmedId) {
          const pubmedMatch = textContent.match(/(?:pmid:|pubmed:)?(\b\d{7,8}\b)/i);
          if (pubmedMatch) pubmedId = pubmedMatch[1];
        }

        if (!title) {
          const firstPage = await pdf.getPage(1);
          const text = await firstPage.getTextContent();
          const textItems = text.items.map((item) => item.str).filter((str) => str.trim());
          title = textItems[0] || '';
          if (title.length > 100 || title.length < 5) {
            title = textItems.find((str) => str.length > 5 && str.length < 100) || '';
          }
        }

        if (!author) {
          const authorMatch = textContent.match(/(?:by\s+|author\(s\):?\s*)([A-Za-z\s,.\-et al.]+)/i);
          if (authorMatch) {
            author = authorMatch[1].trim();
            author = author.replace(/(\s*\([^)]+\))/g, '').replace(/\s+/g, ' ').trim();
          }
          const firstPage = await pdf.getPage(1);
          const text = await firstPage.getTextContent();
          const textItems = text.items.map((item) => item.str).filter((str) => str.trim());

          // Skip the title (first string is usually the title)
          const possibleAuthors = textItems.slice(1, 6).join(' ');

          // Regex for typical author name patterns
          const nameMatch = possibleAuthors.match(/([A-Z][a-z]+(?:\s[A-Z]\.)?\s[A-Z][a-z]+)/g);
          if (nameMatch) {
            author = nameMatch.join(', ');
          }
        }

        if (!access) {
          const textLower = textContent.toLowerCase();
          if (textLower.includes('open access') || textLower.includes('public domain')) {
            access = 'public';
          } else if (textLower.includes('restricted') || textLower.includes('subscription required')) {
            access = 'private';
          }
        }

        if (!copyright) {
          const copyrightMatch = textContent.match(/©\s*(\d{4}\s*[^.]+)/i) || textContent.match(/copyright\s*(\d{4}\s*[^.]+)/i);
          if (copyrightMatch) copyright = copyrightMatch[1].trim();
        }

        if (!publisher) {
          const publisherMatch = textContent.match(/(published by\s*[^.]+)/i) || textContent.match(/(publisher:\s*[^.]+)/i);
          if (publisherMatch) publisher = publisherMatch[1].replace(/published by\s*|publisher:\s*/i, '').trim();
        }
      }

      // --- Step 3: Online lookup fallback ---
      if ((!doi || !pubmedId) && title && author) {
        if (!doi) {
          const foundDOI = await findDOIFromCrossref(title, author);
          if (foundDOI) doi = foundDOI;
        }
        if (!pubmedId) {
          const foundPMID = await findPMIDFromPubMed(title, author);
          if (foundPMID) pubmedId = foundPMID;
        }
      }

      // --- Step 4: Save results ---
      setFormData((prev) => ({
        ...prev,
        doi: doi || prev.doi,
        pubmedid: pubmedId || prev.pubmedid,
        article: title || prev.article,
        author: author || prev.author,
        access: access || prev.access || 'public',
        copyright: copyright || prev.copyright,
        publisher: publisher || prev.publisher,
      }));

      setExtractionErrors({
        doi: !doi,
        pubmedid: !pubmedId,
        article: !title,
        author: !author,
        access: !access,
        copyright: !copyright,
        publisher: !publisher,
      });

      return { doi, pubmedId, title, author, access, copyright, publisher };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      setExtractionErrors({ doi: true, pubmedid: true, article: true, author: true, access: true, copyright: true, publisher: true });
      return { doi: '', pubmedId: '', title: '', author: '', access: '', copyright: '', publisher: '' };
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = useCallback(
    (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile && selectedFile.type === 'application/pdf') {
        if (selectedFile.size > 30 * 1024 * 1024) {
          setFileError('File size exceeds 30 MB. Please select a smaller PDF.');
          setFile(null);
          setFileUrl('');
          return;
        }
        setFileError('');
        setFile(selectedFile);
        setFileUrl(URL.createObjectURL(selectedFile));
        setFormData((prev) => ({
          ...prev,
          file: selectedFile,
          url: '',
        }));

        extractMetadataFromPDF(selectedFile);
      }
    },
    [setFile, setFileUrl, setFormData],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const selectedFile = e.dataTransfer.files[0];
        if (selectedFile.type === 'application/pdf') {
          if (selectedFile.size > 30 * 1024 * 1024) {
            setFileError('File size exceeds 30 MB. Please select a smaller PDF.');
            setFile(null);
            setFileUrl('');
            return;
          }
          setFileError('');
          setFile(selectedFile);
          setFileUrl(URL.createObjectURL(selectedFile));
          setFormData((prev) => ({
            ...prev,
            file: selectedFile,
            url: '',
          }));

          extractMetadataFromPDF(selectedFile);
        }
      }
    },
    [setFile, setFileUrl, setFormData],
  );

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      setFormData({
        ...formData,
        [name]: value,
      });

      if (name === "doi") {
        setDoiTouched(true);
        setExtractionErrors((prev) => ({
          ...prev,
          doi: !isValidDOI(value),
        }));
      }

      if (name === "pubmedid") {
        setPmidTouched(true);
        setExtractionErrors((prev) => ({
          ...prev,
          pubmedid: !isValidPMID(value),
        }));
      }
    },
    [formData, setFormData]
  );

  const handleAccessChange = useCallback(
    (value) => {
      setFormData((prev) => ({
        ...prev,
        access: value,
      }));
    },
    [setFormData],
  );

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleUploadTypeChange = useCallback(
    (value) => {
      setUploadType(value);
      setFormData((prev) => ({
        ...prev,
        file: value === 'file' ? prev.file : null,
        url: value === 'url' ? prev.url || '' : '',
        doi: '',
        pubmedid: '',
        article: '',
        author: '',
        access: 'public',
        copyright: '',
        publisher: '',
      }));
      setExtractionErrors({ doi: false, pubmedid: false, article: false, author: false, access: false, copyright: false, publisher: false });
      if (value === 'url' && fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl('');
        setFile(null);
      }
    },
    [setFormData, fileUrl, setFileUrl, setFile],
  );

  const handleUpload = useCallback(async () => {
    try {
      await handleUploadCollection();
      // Close the dialog on successful upload
      if (dialogCloseRef.current) {
        dialogCloseRef.current.click();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      // Optionally, set an error state to display to the user
      setFileError('Upload failed. Please try again.');
    }
  }, [handleUploadCollection]);

  console.log('...formData', formData);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {isFirstCollection ? (
          // Show button for first upload only if inside a project
          selectedProjectId && (
            <Button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 dark:bg-gray-900 dark:border dark:border-gray-200">
              <Upload className="w-4 h-4" />
              Upload Your First PDF
            </Button>
          )
        ) : (
          // Show Add Collection button only when project has collections
          selectedProjectId && !isFirstCollection && (
            <Button className="bg-gradient-to-r from-purple-500 via-indigo-400 to-blue-400 hover:from-purple-600 hover:via-indigo-500 hover:to-blue-500 dark:from-blue-950/50 dark:to-indigo-950/50 dark:border dark:border-gray-200 text-white">
              Add Collection
            </Button>
          )
        )}                            
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] border-4 border-l-purple-500 border-t-indigo-400 border-b-blue-400 border-r-purple-500 dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>
            Upload Collection
          </DialogTitle>
          <DialogDescription>
            Upload a PDF to your current project. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full">
          {/* Header with Source Type Selection */}
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Badge variant="outline" className="text-xs font-medium w-fit">
                Step 1 of 2
              </Badge>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-white font-medium">SOURCE TYPE</span>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="file-option"
                      name="uploadType"
                      value="file"
                      checked={uploadType === 'file'}
                      onChange={() => handleUploadTypeChange('file')}
                      className="text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="file-option" className="flex flex-row gap-1 justify-center text-center text-sm text-gray-700 dark:text-white font-medium">
                      <FileText className="h-4 w-4" /> <span>File Upload</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="url-option"
                      name="uploadType"
                      value="url"
                      checked={uploadType === 'url'}
                      onChange={() => handleUploadTypeChange('url')}
                      className="text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="url-option" className="flex flex-row gap-1 justify-center text-center text-sm text-gray-700 dark:text-white font-medium">
                      <Link className="h-4 w-4" /><span>URL Link</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* File/URL Upload Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Document Source</h3>

              {uploadType === 'file' ? (
                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 overflow-hidden ${dragActive
                    ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    } ${formData?.file ? 'bg-green-50/50 dark:bg-green-900/20 border-green-300 dark:border-green-600' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="text-center space-y-3">
                    {formData?.file ? (
                      <>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-center sm:text-left min-w-0 flex-1">
                            <p className="font-medium text-green-700 dark:text-green-300 text-sm truncate">
                              {formData.file.name}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {isExtracting && (
                              <p className="text-xs text-gray-500">Extracting metadata...</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {fileUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Open
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-fit mx-auto">
                          <Upload className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                            Drop your PDF here, or{' '}
                            <label
                              htmlFor="fileUpload"
                              className="text-blue-600 hover:text-blue-700 dark:text-white cursor-pointer underline"
                            >
                              browse files
                            </label>
                          </p>
                          <p className="text-sm text-gray-500 mt-1">Supports PDF files up to 30MB</p>
                        </div>
                      </>
                    )}
                  </div>
                  <Input
                    id="fileUpload"
                    type="file"
                    accept="application/pdf"
                    name="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="url-input" className="text-sm font-medium flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Document URL
                  </Label>
                  <Input
                    id="url-input"
                    type="url"
                    placeholder="https://example.com/paper.pdf"
                    name="url"
                    value={formData.url || ''}
                    onChange={handleChange}
                    className="text-base"
                  />
                  <p className="text-xs text-gray-500">Enter a direct link to the PDF document</p>
                </div>
              )}

              {/* Pdf Preview Button */}
              {fileUrl && !isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center justify-center gap-1"
                >
                  {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              )}

              {/* PDF Preview Section */}
              {isMobile && fileUrl && formData?.file && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline my-5">
                  PDF Preview
                </a>
              )}

              {showPreview && fileUrl && formData?.file && !isMobile && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" /> PDF Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-96 border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                      <iframe src={fileUrl} className="w-full h-full" title="PDF Preview" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {fileError && (
              <p className="text-sm text-red-600 mt-2">{fileError}</p>
            )}

            {/* Document Metadata Section (only for file upload) */}
            {uploadType === 'file' && formData?.file && !isExtracting && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Document Metadata</h3>
                {extractionErrors.doi ? (
                  <div className="space-y-2">
                    <Label htmlFor="doi-input" className="text-sm font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      DOI (required)
                    </Label>
                    <Input
                      id="doi-input"
                      type="text"
                      placeholder="10.XXXX/XXXXX"
                      name="doi"
                      value={formData.doi || ''}
                      onChange={handleChange}
                      className={`text-base ${extractionErrors.doi && doiTouched ? 'border-red-500' : ''}`}
                    />
                    {extractionErrors.doi && doiTouched && (
                      <p className="text-xs text-red-600">Invalid DOI format. Example: 10.1000/xyz123</p>
                    )}
                    <p className="text-xs text-gray-500">DOI could not be extracted. Please enter manually.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      DOI
                    </Label>
                    <p className="text-base text-gray-700 dark:text-gray-300">{formData.doi}</p>
                  </div>
                )}
              </div>
            )}

            <div className="w-full flex justify-end text-center gap-2">
              <DialogClose asChild>
                <CustomButton variant='outline' className="mt-1" ref={dialogCloseRef}>Cancel</CustomButton>
              </DialogClose>
              {/* light mode button */}
              <CustomButton
                variant="gradient"
                size="lg"
                icon={Upload}
                iconPosition="left"
                onClick={handleUpload}
                disabled={isButtonDisabled}
                loading={isSubmitting}
                className="w-full sm:w-auto dark:hidden"
              >
                Upload Paper
              </CustomButton>
              {/* dark mode button */}
              <CustomButton
                size="lg"
                icon={Upload}
                iconPosition="left"
                onClick={handleUpload}
                disabled={isButtonDisabled}
                loading={isSubmitting}
                className="w-full sm:w-auto hidden dark:block dark:bg-gray-900 dark:text-white border border-white dark:hover:bg-white dark:hover:text-black"
              >
                Upload Paper
              </CustomButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPdf;
