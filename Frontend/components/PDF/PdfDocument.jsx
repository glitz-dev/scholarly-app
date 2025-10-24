'use client';
import { useEffect, useState, useRef, memo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Card, CardContent } from '../ui/card';
import { MessageSquare, Trash2, X } from 'lucide-react';

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Memoized PdfPage component
const PdfPage = memo(
  ({ pageNum, scale, rotation, isRendered, onRenderSuccess, customTextRenderer, tool, isZoomingRef, canvasRefs }) => {
    const pageCustomTextRenderer = useCallback(
      ({ str, itemIndex }) => customTextRenderer({ str, itemIndex, pageNum }),
      [customTextRenderer, pageNum] // Stable deps: customTextRenderer is memoized, pageNum is constant.
    );
    const canvasRef = useRef(null);

    useEffect(() => {
      canvasRefs.current[pageNum] = canvasRef.current;
      return () => {
        delete canvasRefs.current[pageNum];
      };
    }, [pageNum, canvasRefs]);

    return (
      <div className={`transition-opacity duration-300 ${isRendered ? 'opacity-100' : 'opacity-0'} relative`}>
        <Page
          pageNumber={pageNum}
          canvasBackground="#ffffff"
          renderTextLayer={true}
          renderAnnotationLayer={!isZoomingRef.current}
          scale={scale}
          rotate={rotation}
          onRenderSuccess={() => onRenderSuccess(pageNum)}
          customTextRenderer={pageCustomTextRenderer}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: tool === 'pen' || tool === 'eraser' ? 'auto' : 'none',
            zIndex: tool === 'pen' || tool === 'eraser' ? 10 : 1,
            opacity: 1,
          }}
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.pageNum === nextProps.pageNum &&
      prevProps.scale === nextProps.scale &&
      prevProps.rotation === nextProps.rotation &&
      prevProps.isRendered === nextProps.isRendered &&
      prevProps.customTextRenderer === nextProps.customTextRenderer &&
      prevProps.tool === nextProps.tool &&
      prevProps.isZoomingRef === nextProps.isZoomingRef
    );
  }
);

function PdfDocument({
  pdfUrl,
  numPages,
  pageNumber,
  scale,
  rotation,
  tool,
  searchText,
  renderedPages,
  setRenderedPages,
  pageRefs,
  pdfContainerRef,
  onDocumentLoadSuccess,
  setHasTextLayer,
  textLayerRef,
  textItemsMapRef,
  setSearchResults,
  setCurrentMatch,
  showToast,
  isZoomingRef,
  scrollMode,
  searchResults,
  currentMatch,
  scrollToMatch,
  highlightAll,
  matchCase,
  selectedColor,
  selectedPenColor,
  annotations,
  deleteAnnotation,
  setAnnotations, // Added to update annotations
}) {
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  const [noteState, setNoteState] = useState({ activeNoteId: null, x: 0, y: 0 });

  const { activeNoteId } = noteState;

  const canvasRefs = useRef({});
  const drawingDataRefs = useRef({});
  const firstMatchForAnnotation = useRef({});
  const scrollSpeedFactor = 0.3;

  const saveCanvasData = (pageNum) => {
    const canvas = canvasRefs.current[pageNum];
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`No 2D context for canvas on page ${pageNum}`);
        return;
      }
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      drawingDataRefs.current[pageNum] = imageData;
      console.log(`Saved canvas data for page ${pageNum}`);
    }
  };

  const restoreCanvasData = (pageNum) => {
    const canvas = canvasRefs.current[pageNum];
    const savedData = drawingDataRefs.current[pageNum];
    if (canvas && savedData) {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(`No 2D context for canvas on page ${pageNum}`);
        return;
      }
      ctx.putImageData(savedData, 0, 0);
      console.log(`Restored canvas data for page ${pageNum}`);
    }
  };

  const initializeCanvas = (pageNum) => {
    const canvas = canvasRefs.current[pageNum];
    if (canvas) {
      const pageElement = canvas.closest('[data-page-number]');
      const pdfCanvas = pageElement?.querySelector('.react-pdf__Page__canvas');
      if (pdfCanvas) {
        canvas.width = pdfCanvas.width;
        canvas.height = pdfCanvas.height;
        canvas.style.width = pdfCanvas.style.width;
        canvas.style.height = pdfCanvas.style.height;
        canvas.style.opacity = '1';
        canvas.style.pointerEvents = tool === 'pen' || tool === 'eraser' ? 'auto' : 'none';

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error(`Failed to get 2D context for canvas on page ${pageNum}`);
          return;
        }
        if (!drawingDataRefs.current[pageNum]) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        restoreCanvasData(pageNum);
        console.log(`Initialized canvas for page ${pageNum}: width=${canvas.width}, height=${canvas.height}`);
      } else {
        console.warn(`PDF canvas not found for page ${pageNum}`);
      }
    } else {
      console.warn(`Canvas not found for page ${pageNum}`);
    }
  };

  useEffect(() => {
    Object.keys(canvasRefs.current).forEach((pageNum) => {
      initializeCanvas(parseInt(pageNum));
    });
  }, [scale, tool]);

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    let animationFrameId = null;

    const disablePointerEvents = () => {
      const canvases = container.querySelectorAll('.react-pdf__Page__canvas');
      const textLayers = container.querySelectorAll('.react-pdf__Page__textLayer');
      canvases.forEach((canvas) => (canvas.style.pointerEvents = 'none'));
      textLayers.forEach((textLayer) =>
        (textLayer.style.pointerEvents = tool === 'highlight' || tool === 'text' ? 'auto' : 'none')
      );
    };

    const restorePointerEvents = () => {
      const canvases = container.querySelectorAll('.react-pdf__Page__canvas');
      const textLayers = container.querySelectorAll('.react-pdf__Page__textLayer');
      canvases.forEach((canvas) => (canvas.style.pointerEvents = 'auto'));
      textLayers.forEach((textLayer) => (textLayer.style.pointerEvents = 'auto'));
    };

    const getCanvasForEvent = (e) => {
      const pageElement = e.target.closest('[data-page-number]');
      if (!pageElement) {
        console.warn('No page element found for event');
        return null;
      }
      const pageNum = parseInt(pageElement.getAttribute('data-page-number'));
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) {
        console.warn(`No canvas found for page ${pageNum}`);
      }
      return canvas;
    };

    const getCanvasCoordinates = (e, canvas) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      return { x, y };
    };

    const drawLine = (ctx, start, end) => {
      if (!ctx) {
        console.warn('No canvas context available for drawing');
        return;
      }
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = selectedPenColor || '#87CEEB';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      console.log(`Drawing line from (${start.x}, ${start.y}) to (${end.x}, ${end.y}) with color ${ctx.strokeStyle}`);
    };

    const eraseAtPoint = (canvas, point) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('No canvas context available for erasing');
        return;
      }
      const eraseRadius = 10;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(point.x, point.y, eraseRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    };

    const eraseLineArea = (canvas, start, end) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('No canvas context available for erasing');
        return;
      }
      const eraseRadius = 10;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = eraseRadius * 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    };

    const handleMouseDown = (e) => {
      console.log(`Mouse down with tool: ${tool}, clientX: ${e.clientX}, clientY: ${e.clientY}`);
      if (tool === 'hand') {
        e.preventDefault();
        e.stopPropagation();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      } else if (tool === 'pen') {
        const canvas = getCanvasForEvent(e);
        if (canvas) {
          setIsDrawing(true);
          setIsErasing(false);
          const point = getCanvasCoordinates(e, canvas);
          setLastPoint(point);
          console.log(`Pen tool started at (${point.x}, ${point.y}) on page ${canvas.closest('[data-page-number]').getAttribute('data-page-number')}`);
        }
      } else if (tool === 'eraser') {
        const canvas = getCanvasForEvent(e);
        if (canvas) {
          setIsErasing(true);
          setIsDrawing(false);
          const point = getCanvasCoordinates(e, canvas);
          eraseAtPoint(canvas, point);
          setLastPoint(point);
          console.log(`Eraser tool started at (${point.x}, ${point.y}) on page ${canvas.closest('[data-page-number]').getAttribute('data-page-number')}`);
        }
      }
    };

    const handleMouseMove = (e) => {
      if (tool === 'hand' && isPanning) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => {
          const dx = (panStart.x - e.clientX) * scrollSpeedFactor;
          const dy = (panStart.y - e.clientY) * scrollSpeedFactor;
          if (scrollMode === 'vertical') {
            container.scrollLeft += dx;
            container.scrollTop += dy;
          } else if (scrollMode === 'horizontal') {
            container.scrollLeft += dx;
            container.scrollTop = 0;
          } else if (scrollMode === 'wrapped') {
            container.scrollLeft += dx;
            container.scrollTop += dy;
          }
          setPanStart({ x: e.clientX, y: e.clientY });
          console.log(`Panning: dx=${dx}, dy=${dy}, scrollLeft=${container.scrollLeft}, scrollTop=${container.scrollTop}`);
        });
      } else if (tool === 'pen' && isDrawing) {
        const canvas = getCanvasForEvent(e);
        if (canvas && lastPoint) {
          const ctx = canvas.getContext('2d');
          const currentPoint = getCanvasCoordinates(e, canvas);
          drawLine(ctx, lastPoint, currentPoint);
          setLastPoint(currentPoint);
        }
      } else if (tool === 'eraser' && isErasing) {
        const canvas = getCanvasForEvent(e);
        if (canvas && lastPoint) {
          const currentPoint = getCanvasCoordinates(e, canvas);
          eraseLineArea(canvas, lastPoint, currentPoint);
          setLastPoint(currentPoint);
        }
      }
    };

    const handleMouseUp = (e) => {
      console.log(`Mouse up with tool: ${tool}, clientX: ${e.clientX}, clientY: ${e.clientY}`);
      if (tool === 'hand') {
        setIsPanning(false);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      } else if (tool === 'pen') {
        if (isDrawing) {
          const canvas = getCanvasForEvent(e);
          if (canvas) {
            const pageNum = parseInt(canvas.closest('[data-page-number]').getAttribute('data-page-number'));
            saveCanvasData(pageNum);
          }
        }
        setIsDrawing(false);
        setLastPoint(null);
      } else if (tool === 'eraser') {
        if (isErasing) {
          const canvas = getCanvasForEvent(e);
          if (canvas) {
            const pageNum = parseInt(canvas.closest('[data-page-number]').getAttribute('data-page-number'));
            saveCanvasData(pageNum);
          }
        }
        setIsErasing(false);
        setLastPoint(null);
      }
    };

    const debouncedHandleMouseUp = debounce(handleMouseUp, 100);

    if (tool === 'hand' || tool === 'pen' || tool === 'eraser') {
      container.style.userSelect = 'none';
      disablePointerEvents();
    } else {
      container.style.userSelect = 'auto';
      restorePointerEvents();
    }

    container.addEventListener('mousedown', handleMouseDown, { capture: true });
    container.addEventListener('mousemove', handleMouseMove, { capture: true });
    container.addEventListener('mouseup', debouncedHandleMouseUp, { capture: true });
    container.addEventListener('mouseleave', debouncedHandleMouseUp, { capture: true });

    return () => {
      container.style.userSelect = 'auto';
      restorePointerEvents();
      container.removeEventListener('mousedown', handleMouseDown, { capture: true });
      container.removeEventListener('mousemove', handleMouseMove, { capture: true });
      container.removeEventListener('mouseup', debouncedHandleMouseUp, { capture: true });
      container.removeEventListener('mouseleave', debouncedHandleMouseUp, { capture: true });
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [tool, scrollMode, selectedPenColor, isPanning, isDrawing, isErasing, lastPoint, pdfContainerRef]);

  const onPageRenderSuccess = async (pageNumber) => {
    try {
      const page = await pdfjs
        .getDocument(decodeURIComponent(pdfUrl))
        .promise.then((pdf) => pdf.getPage(pageNumber));
      const textContent = await page.getTextContent();
      const items = textContent.items.map((item) => item.str);
      const text = items.join(' ');
      textLayerRef.current[pageNumber] = text;
      console.log(`Text extracted for page ${pageNumber}:`, text.substring(0, 100) + '...');
      // Build item offset map aligned with join(' ')
      try {
        let cursor = 0;
        const offsets = items.map((s, idx) => {
          const start = cursor;
          const end = start + (s ? s.length : 0);
          // advance cursor (+1 space between items except after last)
          cursor = end + (idx < items.length - 1 ? 1 : 0);
          return { start, end, str: s ?? '' };
        });
        if (textItemsMapRef && textItemsMapRef.current) {
          textItemsMapRef.current[pageNumber] = offsets;
        }
      } catch (e) {
        console.warn('Failed building text item offsets for page', pageNumber, e);
      }
      if (!text.trim()) {
        console.warn(`No text content found on page ${pageNumber}. PDF may lack text layer.`);
        setHasTextLayer(false);
      } else {
        setHasTextLayer(true);
      }
      setRenderedPages((prev) => ({ ...prev, [pageNumber]: true }));
      initializeCanvas(pageNumber);
      // Initialize firstMatchForAnnotation for the page only if it doesn't exist
      if (!firstMatchForAnnotation.current[pageNumber]) {
        firstMatchForAnnotation.current[pageNumber] = {};
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      setHasTextLayer(false);
    }
  };

  const searchInPDF = (text) => {
    if (!text) {
      setSearchResults([]);
      setCurrentMatch(0);
      return;
    }

    const matches = [];
    let globalMatchIndex = 0;

    Object.keys(textLayerRef.current).forEach((pageNum) => {
      const pageText = textLayerRef.current[pageNum] || '';
      let index = 0;
      while (index !== -1) {
        index = matchCase
          ? pageText.indexOf(text, index)
          : pageText.toLowerCase().indexOf(text.toLowerCase(), index);
        if (index !== -1) {
          matches.push({
            page: parseInt(pageNum),
            startIndex: index,
            endIndex: index + text.length,
            text: pageText.slice(index, index + text.length),
            matchIndex: globalMatchIndex++,
          });
          index += 1;
        }
      }
    });

    setSearchResults(matches);
    setCurrentMatch(0);
    console.log(`Found ${matches.length} matches for "${text}" (matchCase: ${matchCase})`);

    if (matches.length > 0) {
      const firstMatchPage = pageRefs.current[matches[0].page - 1];
      if (firstMatchPage) {
        firstMatchPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => scrollToMatch(matches[0]), 500);
      }
    } else {
      console.log(`No matches found for "${text}"`);
    }
  };

  const toggleNoteBox = (annotationId, event) => {
    const noteIcon = event.target;
    if (!noteIcon) return;

    // Use noteState for checking/setting
    if (noteState.activeNoteId === annotationId) {
      setNoteState({ activeNoteId: null, x: 0, y: 0 }); // CLOSE
      console.log(`Closed note-box for annotation ${annotationId}`);
      return;
    } else {
      const container = pdfContainerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const rect = noteIcon.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const noteBoxWidth = 200; // Matches note-box width in CSS
      const noteBoxHeight = 200; // Approximate max note-box height
      const offsetX = 20; // Offset from the note-icon
      const offsetY = 10; // Slight vertical offset

      // Calculate position relative to container content
      let x = scrollLeft + (rect.right - containerRect.left) + offsetX;
      let y = scrollTop + (rect.top - containerRect.top) + offsetY;

      // Horizontal boundary check and flip if necessary
      if (x + noteBoxWidth > scrollLeft + containerWidth) {
        x = scrollLeft + (rect.left - containerRect.left) - noteBoxWidth - offsetX;
      }
      if (x < scrollLeft) {
        x = scrollLeft + offsetX;
      }

      // Vertical boundary check and flip above if necessary
      if (y + noteBoxHeight > scrollTop + containerHeight) {
        y = scrollTop + (rect.bottom - containerRect.top) - noteBoxHeight - offsetY;
      }
      if (y < scrollTop) {
        y = scrollTop + offsetY;
      }

      setNoteState({ activeNoteId: annotationId, x, y }); // OPEN
      console.log(`Opening note-box for annotation ${annotationId} at position (${x}, ${y})`);
    }
  };

  useEffect(() => {
    searchInPDF(searchText);
  }, [searchText, matchCase]);

  useEffect(() => {
    const handleNoteIconClick = (e) => {
      if (e.target.classList.contains('note-icon')) {
        // FIX: Stop propagation to prevent this click from triggering other
        // mouse/text layer events that lead to flickering/double-renders.
        e.stopPropagation();
        e.preventDefault();

        const annotationId = e.target.getAttribute('data-annotation-id');
        toggleNoteBox(annotationId, e);
      }
    };

    const container = pdfContainerRef.current;
    if (container) {
      container.addEventListener('click', handleNoteIconClick);
    }

    return () => {
      if (container) {
        container.removeEventListener('click', handleNoteIconClick);
      }
    };
  }, []); // toggleNoteBox is stable due to using state setter

  // Keep active highlight styling in sync without re-rendering text layer
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    // Remove active state from all previously active highlights
    container
      .querySelectorAll(
        '.react-pdf__Page__textContent.textLayer .highlight-with-note.active-highlight'
      )
      .forEach((el) => el.classList.remove('active-highlight'));

    // Add active state to the currently selected annotation highlights
    if (noteState.activeNoteId) {
      container
        .querySelectorAll(
          `.react-pdf__Page__textContent.textLayer [data-annotation-id="${noteState.activeNoteId}"]`
        )
        .forEach((el) => el.classList.add('active-highlight'));
    }
  }, [noteState.activeNoteId, pdfContainerRef]);

  // Handle color change for an annotation
  const handleColorChange = (annotationId, newColor) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annotationId ? { ...ann, color: newColor } : ann
      )
    );
    console.log(`Changed color for annotation ${annotationId} to ${newColor}`);
  };

  // --- START MEMOIZED customTextRenderer ---
  const memoizedCustomTextRenderer = useCallback(
    ({ str, itemIndex, pageNum }) => {
      let result = str;

      // Filter annotations specific to this page
      const pageAnnotations = annotations.filter((ann) => ann.page === pageNum);

      if (searchText && searchResults.length > 0) {
        const searchTextForMatch = matchCase ? searchText : searchText.toLowerCase();
        const parts = [];
        let index = 0;
        const pageText = textLayerRef.current[pageNum] || '';
        let absoluteIndex = pageText.indexOf(str);

        while (index < str.length) {
          const searchIndex = matchCase
            ? str.indexOf(searchText, index)
            : str.toLowerCase().indexOf(searchTextForMatch, index);
          if (searchIndex === -1) {
            parts.push(str.slice(index));
            break;
          }

          const absoluteStartIndex = absoluteIndex + searchIndex;
          const match = searchResults.find(
            (m) => m.page === pageNum && m.startIndex === absoluteStartIndex
          );

          if (match) {
            const matchText = str.slice(searchIndex, searchIndex + searchText.length);
            const highlightStyle =
              highlightAll && match.matchIndex !== currentMatch
                ? 'background-color: #ADD8E6; color: black; padding: 2px 4px;'
                : match.matchIndex === currentMatch
                  ? 'background-color: #4169E1; color: white; padding: 2px 4px;'
                  : '';

            if (highlightStyle) {
              parts.push(str.slice(index, searchIndex));
              parts.push(
                `<mark class="search-match${match.matchIndex === currentMatch ? ' active-match' : ''
                }" data-match-index="${match.matchIndex}" style="${highlightStyle}">${matchText}</mark>`
              );
            } else {
              parts.push(str.slice(index, searchIndex + searchText.length));
            }
          } else {
            parts.push(str.slice(index, searchIndex + searchText.length));
          }

          index = searchIndex + searchText.length;
          absoluteIndex += searchIndex + searchText.length;
        }

        if (parts.length > 0) {
          result = parts.join('');
        }
      }

      // Annotation highlighting based on absolute index ranges
      try {
        const itemOffsets = textItemsMapRef?.current?.[pageNum]?.[itemIndex];
        if (itemOffsets) {
          const itemStart = itemOffsets.start;
          const itemEnd = itemOffsets.end;
          // Build intervals for all overlapping annotations on this item
          const intervals = [];
          for (const ann of pageAnnotations) {
            const hasNote = typeof ann.note === 'string' && ann.note.trim().length > 0;
            const hasIndices = typeof ann.startIndex === 'number' && typeof ann.endIndex === 'number';
            if (!hasNote || !hasIndices) continue;
            if (ann.endIndex <= itemStart || ann.startIndex >= itemEnd) continue; // no overlap
            const startInItem = Math.max(ann.startIndex, itemStart) - itemStart;
            const endInItem = Math.min(ann.endIndex, itemEnd) - itemStart;
            if (endInItem > startInItem) {
              intervals.push({ start: startInItem, end: endInItem, ann });
            }
          }
          if (intervals.length > 0) {
            intervals.sort((a, b) => a.start - b.start || a.end - b.end);
            const parts = [];
            let cursor = 0;
            for (const seg of intervals) {
              if (seg.start > cursor) {
                parts.push(str.slice(cursor, seg.start));
              }
              const segText = str.slice(seg.start, seg.end);
              const className = 'highlight-with-note';
              const style = `background-color: ${seg.ann.color}; color: black; position: relative;`;
              // Include icon once at the very start of the annotation range
              let noteIconHtml = '';
              const isStartOfAnnotation = itemStart + seg.start === seg.ann.startIndex;
              if (isStartOfAnnotation) {
                if (!firstMatchForAnnotation.current[pageNum]) {
                  firstMatchForAnnotation.current[pageNum] = {};
                }
                if (!firstMatchForAnnotation.current[pageNum][seg.ann.id]) {
                  firstMatchForAnnotation.current[pageNum][seg.ann.id] = { index: seg.ann.startIndex };
                  noteIconHtml = `<span class="note-icon" data-annotation-id="${seg.ann.id}" style="display: inline-block; width: 16px; height: 16px; margin-right: 4px; cursor: pointer;"></span>`;
                }
              }
              parts.push(
                `<span class="${className}" style="${style}" data-annotation-id="${seg.ann.id}">${noteIconHtml}${segText}</span>`
              );
              cursor = seg.end;
            }
            if (cursor < str.length) {
              parts.push(str.slice(cursor));
            }
            result = parts.join('');
          } else {
            // Fallback: no index-based overlap on this item; attempt simple text inclusion highlighting
            pageAnnotations.forEach((ann) => {
              const hasNote = typeof ann.note === 'string' && ann.note.trim().length > 0;
              if (!hasNote) return;
              if (!ann.text || !str) return;
              if (!ann.text.includes(str)) return;
              const pageText = textLayerRef.current[pageNum] || '';
              const absoluteIndex = ann.startIndex ?? pageText.indexOf(str);
              const isStartOfAnnotation =
                absoluteIndex !== -1 &&
                (!firstMatchForAnnotation.current[pageNum]?.[ann.id] ||
                  firstMatchForAnnotation.current[pageNum][ann.id].index === absoluteIndex);
              if (isStartOfAnnotation) {
                if (!firstMatchForAnnotation.current[pageNum]) {
                  firstMatchForAnnotation.current[pageNum] = {};
                }
                firstMatchForAnnotation.current[pageNum][ann.id] = { index: absoluteIndex };
              }
              const className = 'highlight-with-note';
              const style = `background-color: ${ann.color}; color: black; position: relative;`;
              if (isStartOfAnnotation) {
                const noteIconHtml = `<span class="note-icon" data-annotation-id="${ann.id}" style="display: inline-block; width: 16px; height: 16px; margin-right: 4px; cursor: pointer;"></span>`;
                result = `<span class="${className}" style="${style}" data-annotation-id="${ann.id}">${noteIconHtml}${str}</span>`;
              } else {
                result = `<span class="${className}" style="${style}" data-annotation-id="${ann.id}">${str}</span>`;
              }
            });
          }
        } else {
          // Fallback to previous heuristic when offsets are unavailable
          pageAnnotations.forEach((ann) => {
            const hasNote = typeof ann.note === 'string' && ann.note.trim().length > 0;
            if (
              hasNote &&
              ann.text &&
              str &&
              ann.text.includes(str) &&
              /\w/.test(str)
            ) {
              const pageText = textLayerRef.current[pageNum] || '';
              const absoluteIndex = ann.startIndex || pageText.indexOf(str);
              const isStartOfAnnotation =
                absoluteIndex !== -1 &&
                (!firstMatchForAnnotation.current[pageNum]?.[ann.id] ||
                  firstMatchForAnnotation.current[pageNum][ann.id].index === absoluteIndex);
              if (isStartOfAnnotation) {
                if (!firstMatchForAnnotation.current[pageNum]) {
                  firstMatchForAnnotation.current[pageNum] = {};
                }
                firstMatchForAnnotation.current[pageNum][ann.id] = { index: absoluteIndex };
              }
              const className = 'highlight-with-note';
              const style = `background-color: ${ann.color}; color: black; position: relative;`;
              if (isStartOfAnnotation) {
                const noteIconHtml = `<span class="note-icon" data-annotation-id="${ann.id}" style="display: inline-block; width: 16px; height: 16px; margin-right: 4px; cursor: pointer;"></span>`;
                result = `<span class="${className}" style="${style}" data-annotation-id="${ann.id}">${noteIconHtml}${str}</span>`;
              } else {
                result = `<span class="${className}" style="${style}" data-annotation-id="${ann.id}">${str}</span>`;
              }
            }
          });
        }
      } catch (e) {
        console.warn('Annotation rendering error:', e);
      }
      // Ensure each item has a data-item-index wrapper to compute selections reliably
      return `<span data-item-index="${itemIndex}">${result}</span>`;
    },
    [
      searchText,
      searchResults,
      currentMatch,
      highlightAll,
      matchCase,
      annotations,
      textLayerRef,
      firstMatchForAnnotation,
    ]
  );
  // --- END MEMOIZED customTextRenderer ---

  console.log('PdfDocument props:', { tool, selectedPenColor });

  return (
    <div
      ref={pdfContainerRef}
      className={`flex dark:bg-gray-800 ${scrollMode === 'vertical' ? 'flex-col' : scrollMode === 'horizontal' ? 'flex-row' : 'flex-row flex-wrap'
        } items-center py-3 overflow-auto will-change-transform ${tool === 'hand'
          ? isPanning
            ? 'cursor-grabbing hand-tool-active'
            : 'cursor-grab hand-tool-active'
          : tool === 'highlight' || tool === 'text'
            ? 'cursor-text'
            : tool === 'pen'
              ? 'cursor-crosshair'
              : tool === 'eraser'
                ? 'cursor-pointer'
                : 'cursor-default'
        }`}
      style={{
        maxHeight: 'calc(100vh - 60px)',
        backgroundColor: '#e5e7eb',
        position: 'relative',
        ...(scrollMode === 'horizontal' ? { overflowY: 'hidden' } : {}),
        ...(scrollMode === 'wrapped' ? { justifyContent: 'center', gap: '1rem' } : {}),
      }}
    >
      <div className="pdf-viewer" style={{ '--selected-color': selectedColor, color: 'black' }}>
        <Document
          file={decodeURIComponent(pdfUrl)}
          onLoadSuccess={onDocumentLoadSuccess}
          className={`flex ${scrollMode === 'vertical' ? 'flex-col' : scrollMode === 'horizontal' ? 'flex-row' : 'flex-row flex-wrap'
            } items-center`}
          loading={
            <div className="flex items-center justify-center h-screen">
              <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="alert">
                <div className="w-12 h-12 animate-spin text-gray-500" />
                <p className="text-sm text-gray-600 font-medium">Loading PDF document...</p>
              </div>
            </div>
          }
          onLoadError={(error) => {
            console.error('PDF load error:', error);
            showToast({
              title: 'Error',
              description: 'Failed to load PDF',
              variant: 'error',
            });
          }}
        >
          {Array.from({ length: numPages || 0 }, (_, index) => {
            const pageNum = index + 1;
            const isRendered = renderedPages[pageNum];

            return (
              <div
                key={pageNum}
                ref={(el) => (pageRefs.current[index] = el)}
                data-page-number={pageNum}
                className={`mb-6 relative ${scrollMode === 'horizontal' ? 'mr-6' : scrollMode === 'wrapped' ? 'm-2' : ''
                  }`}
                style={scrollMode === 'wrapped' ? { flex: '0 0 auto', maxWidth: '45%' } : {}}
              >
                <Card
                  className={`w-[210mm] h-[297mm] max-w-[90vw] bg-white border border-gray-300 rounded-md shadow-md flex flex-col justify-center items-center p-6 mx-auto ${isRendered ? 'hidden' : 'block'
                    }`}
                  style={{ transition: 'opacity 0.3s ease' }}
                >
                  <CardContent className="w-full relative z-10">
                    <div className="space-y-4 mt-4">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto animate-pulse" />
                      <div className="h-5 bg-gray-200 rounded w-5/6 mx-auto animate-pulse" />
                      <div className="h-5 bg-gray-200 rounded w-2/3 mx-auto animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
                <PdfPage
                  pageNum={pageNum}
                  scale={scale}
                  rotation={rotation}
                  isRendered={isRendered}
                  onRenderSuccess={onPageRenderSuccess}
                  // Pass the memoized function and its required dynamic data (pageNum)
                  customTextRenderer={memoizedCustomTextRenderer} // Pass stable renderer; PdfPage handles pageNum internally.
                  tool={tool}
                  isZoomingRef={isZoomingRef}
                  canvasRefs={canvasRefs}
                />
              </div>
            );
          })}
        </Document>
        {/* Note Box Rendering - updated to use noteState and add color picker */}
        {noteState.activeNoteId && (() => {
          const ann = annotations.find(a => a.id === noteState.activeNoteId);
          if (!ann) return null;
          return (
            <div
              className="note-overlay"
              style={{
                position: 'absolute',
                top: noteState.y,
                left: noteState.x,
                zIndex: 200,
              }}
            >
              <div className="note-box">
                <div className="note-header">
                  <span className="note-title">Note</span>
                  <div className="note-actions">
                    <button
                      onClick={() => {
                        deleteAnnotation(noteState.activeNoteId);
                        setNoteState({ activeNoteId: null, x: 0, y: 0 });
                      }}
                      className="note-delete-btn"
                      title="Delete Note"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setNoteState({ activeNoteId: null, x: 0, y: 0 });
                      }}
                      className="note-close-btn"
                      title="Close Note"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="note-content">
                  <p>{ann.note}</p>
                  <div className="color-picker mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Highlight Color
                    </label>
                    <input
                      type="color"
                      value={ann.color}
                      onChange={(e) => handleColorChange(ann.id, e.target.value)}
                      className="w-full h-8 border border-gray-300 rounded-md cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      <style>
        {`
          /* Enhanced active highlight with glow effect */
          .highlight-with-note.active-highlight {
            outline: 2px solid #3b82f6; 
            outline-offset: 2px;
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
            animation: pulseGlow 2s ease-in-out infinite;
          }

          @keyframes pulseGlow {
            0%, 100% {
              box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
            }
            50% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
            }
          }

          /* Note icon using MessageSquare lucide icon style */
          .note-icon {
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-right: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          }

          .note-icon::before {
            content: '';
            position: absolute;
            inset: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="blue" stroke="%23667eea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>') no-repeat center;
            background-size: contain;
            filter: drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3));
          }

          .note-icon:hover::before {
            transform: scale(1.15);
            filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.5));
          }

          .note-overlay {
            position: absolute;
            pointer-events: auto;
            animation: fadeInSlide 0.3s ease-out;
          }

          @keyframes fadeInSlide {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Enhanced note box with modern design */
          .note-box {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
            width: 280px;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            pointer-events: auto;
            backdrop-filter: blur(10px);
          }

          /* Enhanced header with gradient */
          .note-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 12px 16px;
            border-bottom: none;
          }

          .note-title {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.3px;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .note-actions {
            display: flex;
            gap: 6px;
          }

          /* Enhanced action buttons */
          .note-delete-btn,
          .note-close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .note-delete-btn {
            color: #ffffff;
          }

          .note-delete-btn:hover {
            background: rgba(239, 68, 68, 0.9);
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }

          .note-close-btn {
            color: #ffffff;
          }

          .note-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
          }

          /* Enhanced content area */
          .note-content {
            padding: 16px;
            max-height: 250px;
            overflow-y: auto;
            background: #ffffff;
          }

          .note-content::-webkit-scrollbar {
            width: 6px;
          }

          .note-content::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }

          .note-content::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
          }

          .note-content p {
            margin: 0;
            font-size: 14px;       
            color: #1e293b;
            line-height: 1.6;
            padding: 8px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 3px solid #667eea;
          }

          /* Enhanced color picker */
          .color-picker {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
          }

          .color-picker label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .color-picker label::before {
            content: '🎨';
            font-size: 14px;
          }

          .color-picker input[type="color"] {
            padding: 4px;
            width: 100%;
            height: 40px;
            border-radius: 8px;
            border: 2px solid #e2e8f0;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #ffffff;
          }

          .color-picker input[type="color"]:hover {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .color-picker input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 4px;
          }

          .color-picker input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 4px;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        `}
      </style>
    </div>
  );
}

export default memo(PdfDocument, (prevProps, nextProps) => {
  return (
    prevProps.pdfUrl === nextProps.pdfUrl &&
    prevProps.numPages === nextProps.numPages &&
    prevProps.scale === nextProps.scale &&
    prevProps.rotation === nextProps.rotation &&
    prevProps.searchText === nextProps.searchText &&
    prevProps.matchCase === nextProps.matchCase &&
    prevProps.highlightAll === nextProps.highlightAll &&
    prevProps.selectedColor === nextProps.selectedColor &&
    prevProps.selectedPenColor === nextProps.selectedPenColor &&
    prevProps.scrollMode === nextProps.scrollMode &&
    prevProps.tool === nextProps.tool &&
    prevProps.annotations === nextProps.annotations &&
    prevProps.renderedPages === nextProps.renderedPages
  );
});