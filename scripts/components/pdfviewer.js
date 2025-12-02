export default class PdfViewer {
    constructor(containerId, pdfUrl) {
        this.container = document.getElementById(containerId);
        this.url = pdfUrl;

        if(this.container === null) {
            console.error(`PdfViewer: Container #${containerId} not found.`);
            return;
        }

        // State
        this.pdfDoc = null;
        this.pageNum = 1;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.currentScale = 1.0;
        this.baseScale = 1.0;
        this.isDragging = false;
        this.startPan = { x: 0, y: 0 };
        this.scrollPos = { left: 0, top: 0 };
        this.wheelAccumulator = 0;

        // DOM Elements
        this.canvas = null;
        this.ctx = null;
        this.scrollWrapper = null;
        this.zoomDisplay = null;
        this.pageCountDisplay = null;
        this.pageNumDisplay = null;
        this.loadingSpinner = null;

        this.init();
    }

    init() {
        this.renderUI();
        this.loadDocument();
        this.addEventListeners();
    }

    renderUI() {
        // Inject the HTML structure
        this.container.innerHTML = `
            <div class="pdf-controls">
                <div class="pdf-controls-group">
                    <button data-action="prev" class="pdf-button" title="Previous Page"><i class="fa-solid fa-arrow-left"></i></button>
                    <span class="pdf-page-info">
                        <span id="pdf-page-num">1</span> / <span id="pdf-page-count">--</span>
                    </span>
                    <button data-action="next" class="pdf-button" title="Next Page"><i class="fa-solid fa-arrow-right"></i></button>
                </div>
                
                <div class="pdf-controls-group">
                    <button data-action="zoom-out" class="pdf-button" title="Zoom Out"><i class="fa-solid fa-minus"></i></button>
                    <span id="pdf-zoom-level" style="min-width: 3.5em; text-align: center;">100%</span>
                    <button data-action="zoom-in" class="pdf-button" title="Zoom In"><i class="fa-solid fa-plus"></i></button>
                </div>

                <div class="pdf-controls-group">
                     <button data-action="fullscreen" class="pdf-button" title="Toggle Fullscreen">
                        <i class="fa-solid fa-expand"></i>
                     </button>
                </div>
            </div>

            <div class="pdf-viewport-container">
                <div id="pdf-loading" class="pdf-loading hidden">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                </div>
                <div id="pdf-scroll-wrapper" class="pdf-scroll-wrapper">
                    <canvas id="pdf-canvas" class="pdf-canvas"></canvas>
                </div>
            </div>
        `;

        // Cache DOM references
        this.canvas = this.container.querySelector('#pdf-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scrollWrapper = this.container.querySelector('#pdf-scroll-wrapper');
        this.zoomDisplay = this.container.querySelector('#pdf-zoom-level');
        this.pageCountDisplay = this.container.querySelector('#pdf-page-count');
        this.pageNumDisplay = this.container.querySelector('#pdf-page-num');
        this.loadingSpinner = this.container.querySelector('#pdf-loading');
    }

    async loadDocument() {
        try {
            if (window.pdfjsLib === null) throw new Error("PDF.js library not loaded");

            this.showLoading(true);
            this.pdfDoc = await window.pdfjsLib.getDocument(this.url).promise;
            this.pageCountDisplay.textContent = this.pdfDoc.numPages;

            // Initial Fit Logic
            const page = await this.pdfDoc.getPage(1);
            const containerWidth = this.container.clientWidth || 800;
            const unscaledViewport = page.getViewport({ scale: 1 });
            
            // Fit to width, but cap max initial zoom if image is huge
            this.baseScale = containerWidth / unscaledViewport.width;
            this.currentScale = this.baseScale;

            this.renderPage(this.pageNum);
        } catch (err) {
            console.error("Error loading PDF:", err);
            this.container.innerHTML = `<p class="pdf-error">Unable to load drawings. <a href="${this.url}">Download File</a></p>`;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Renders the page.
     * @param {number} num - Page number
     * @param {Object} [pivot] - Optional point to maintain centered {x: 0-1, y: 0-1, offsetX: px, offsetY: px}
     */
    renderPage(num, pivot = null) {
        this.pageRendering = true;
        this.showLoading(true);

        this.pdfDoc.getPage(num).then((page) => {
            const viewport = page.getViewport({ scale: this.currentScale });

            // --- HIGH DPI SUPPORT ---
            const outputScale = window.devicePixelRatio || 1;

            this.canvas.width = Math.floor(viewport.width * outputScale);
            this.canvas.height = Math.floor(viewport.height * outputScale);
            
            this.canvas.style.width = Math.floor(viewport.width) + "px";
            this.canvas.style.height = Math.floor(viewport.height) + "px";

            // --- ZOOM CENTERING LOGIC ---
            // If a pivot point was provided (from zoomIn/Out/Wheel), adjust scroll now that dimensions are set
            if (pivot) {
                // Calculate new scroll position to keep the pivot point stationary relative to viewport/mouse
                this.scrollWrapper.scrollLeft = (pivot.x * viewport.width) - pivot.viewerX;
                this.scrollWrapper.scrollTop = (pivot.y * viewport.height) - pivot.viewerY;
            }

            const transform = outputScale !== 1 
                ? [outputScale, 0, 0, outputScale, 0, 0] 
                : null;

            // Update UI
            const percentage = Math.round((this.currentScale / this.baseScale) * 100);
            this.zoomDisplay.textContent = `${percentage}%`;
            this.pageNumDisplay.textContent = num;

            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport,
                transform: transform 
            };

            const renderTask = page.render(renderContext);

            renderTask.promise.then(() => {
                this.pageRendering = false;
                this.showLoading(false);
                if (this.pageNumPending !== null) {
                    this.renderPage(this.pageNumPending);
                    this.pageNumPending = null;
                }
            });
        });
    }

    queueRenderPage(num) {
        if (this.pageRendering) {
            this.pageNumPending = num;
        } else {
            this.renderPage(num);
        }
    }

    showLoading(isLoading) {
        if(this.loadingSpinner) {
            if(isLoading) this.loadingSpinner.classList.remove('hidden');
            else this.loadingSpinner.classList.add('hidden');
        }
    }

    // --- INTERACTION HANDLERS ---

    addEventListeners() {
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.container.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            if (action === 'prev') this.prevPage();
            if (action === 'next') this.nextPage();
            if (action === 'zoom-in') this.zoomIn();
            if (action === 'zoom-out') this.zoomOut();
            if (action === 'fullscreen') this.toggleFullscreen();
        });

        // Mouse Wheel Zoom (Ctrl + Wheel)
        this.scrollWrapper.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Resize Debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 200);
        });

        // Listen for fullscreen change to update icon or layout if needed
        document.addEventListener('fullscreenchange', () => this.handleResize());

        this.initPanLogic();
    }

    handleWheel(e) {
        if (!e.ctrlKey && !e.metaKey) return; // Only zoom if Ctrl is held

        e.preventDefault();

        // Accumulate delta to handle both mouse wheels (stepped) and trackpads (continuous)
        this.wheelAccumulator += e.deltaY;

        // Threshold: preventing micro-jitters from trackpads. 
        // 50 is approx half a standard mouse wheel notch.
        const ZOOM_THRESHOLD = 50;

        if (Math.abs(this.wheelAccumulator) < ZOOM_THRESHOLD) return;

        // Determine direction
        const direction = this.wheelAccumulator > 0 ? 'out' : 'in';

        // Reset accumulator to stop it from triggering multiple times instantly
        this.wheelAccumulator = 0;

        // --- Calculate Target Scale (Snapped to 25%) ---
        const currentPct = (this.currentScale / this.baseScale) * 100;
        let nextPct;

        if (direction === 'in') {
             // Next 25% step up (e.g. 102% -> 125%)
             nextPct = (Math.floor((currentPct + 0.1) / 25) + 1) * 25;
             if (nextPct > 500) nextPct = 500;
        } else {
             // Prev 25% step down (e.g. 122% -> 100%)
             nextPct = (Math.ceil((currentPct - 0.1) / 25) - 1) * 25;
             if (nextPct < 50) nextPct = 50;
        }

        const newScale = (nextPct / 100) * this.baseScale;

        // Avoid re-rendering if we are already at the limit
        if (Math.abs(newScale - this.currentScale) < 0.001) return;

        // --- Pivot Logic (Keep mouse stationary relative to content) ---
        // Calculate mouse position relative to the CANVAS element (ignoring margins/padding)
        const canvasRect = this.canvas.getBoundingClientRect();

        // Offset of mouse within the image
        const mouseXRel = e.clientX - canvasRect.left;
        const mouseYRel = e.clientY - canvasRect.top;
        
        // Pivot point (0.0 to 1.0) on the PDF page
        const pivotX = mouseXRel / canvasRect.width;
        const pivotY = mouseYRel / canvasRect.height;

        // We also need the mouse position relative to the viewport (the "viewer" window)
        // to tell renderPage where to position that pivot point on screen.
        const wrapperRect = this.scrollWrapper.getBoundingClientRect();
        const viewerX = e.clientX - wrapperRect.left;
        const viewerY = e.clientY - wrapperRect.top;

        this.currentScale = newScale;
        
        this.renderPage(this.pageNum, { 
            x: pivotX, 
            y: pivotY, 
            viewerX: viewerX, 
            viewerY: viewerY 
        });
    }

    initPanLogic() {
        const slider = this.scrollWrapper;

        // Mouse Events
        slider.addEventListener('mousedown', (e) => this.startDrag(e.clientX, e.clientY));
        slider.addEventListener('mouseleave', () => this.endDrag());
        slider.addEventListener('mouseup', () => this.endDrag());
        slider.addEventListener('mousemove', (e) => this.doDrag(e, e.clientX, e.clientY));

        // Touch Events
        slider.addEventListener('touchstart', (e) => {
            this.startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        slider.addEventListener('touchend', () => this.endDrag());
        
        slider.addEventListener('touchmove', (e) => {
            if (this.isDragging) e.preventDefault(); 
            this.doDrag(e, e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });
    }

    startDrag(clientX, clientY) {
        this.isDragging = true;
        this.scrollWrapper.classList.add('grabbing');
        this.startPan.x = clientX;
        this.startPan.y = clientY;
        this.scrollPos.left = this.scrollWrapper.scrollLeft;
        this.scrollPos.top = this.scrollWrapper.scrollTop;
    }

    endDrag() {
        this.isDragging = false;
        this.scrollWrapper.classList.remove('grabbing');
    }

    doDrag(e, clientX, clientY) {
        if (!this.isDragging) return;
        
        const deltaX = clientX - this.startPan.x;
        const deltaY = clientY - this.startPan.y;

        this.scrollWrapper.scrollLeft = this.scrollPos.left - deltaX;
        this.scrollWrapper.scrollTop = this.scrollPos.top - deltaY;
    }

    // --- ACTIONS ---

    prevPage() {
        if (this.pageNum <= 1) return;
        this.pageNum--;
        this.queueRenderPage(this.pageNum);
    }

    nextPage() {
        if (this.pageNum >= this.pdfDoc.numPages) return;
        this.pageNum++;
        this.queueRenderPage(this.pageNum);
    }

    zoomIn() {
        // Calculate current percentage (e.g. 100, 115, 125)
        const currentPct = (this.currentScale / this.baseScale) * 100;
        
        // Calculate next 25% step
        // Math.floor ensures we find the base of the current block, then +1 to step up
        // We add a tiny epsilon (0.1) to handle floating point imprecision
        let nextPct = (Math.floor((currentPct + 0.1) / 25) + 1) * 25;
        
        // Cap Max Zoom at 500%
        if (nextPct > 500) nextPct = 500;
        
        // Apply new scale
        const newScale = (nextPct / 100) * this.baseScale;
        
        // Prevent redundant renders if we are already at max
        if (Math.abs(newScale - this.currentScale) < 0.001) return;

        this.currentScale = newScale;

        // Calculate Center of Viewport for Zoom Pivot
        const viewportW = this.scrollWrapper.clientWidth;
        const viewportH = this.scrollWrapper.clientHeight;

        // Center of viewport is our target. 
        // For the pivot on the image, we assume the center of the viewport is looking at the center of the image
        // UNLESS the image is offset.
        // A simple robust way for buttons is to pivot on the center of the VIEWPORT relative to the CANVAS.
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const wrapperRect = this.scrollWrapper.getBoundingClientRect();
        
        // Find the center point of the wrapper
        const wrapperCenterX = wrapperRect.left + (wrapperRect.width / 2);
        const wrapperCenterY = wrapperRect.top + (wrapperRect.height / 2);
        
        // Map that screen pixel to the canvas
        const pivotX = (wrapperCenterX - canvasRect.left) / canvasRect.width;
        const pivotY = (wrapperCenterY - canvasRect.top) / canvasRect.height;
        
        this.renderPage(this.pageNum, {
            x: pivotX,
            y: pivotY,
            viewerX: viewportW / 2, 
            viewerY: viewportH / 2
        });
    }

    zoomOut() {
        const currentPct = (this.currentScale / this.baseScale) * 100;
        
        // Calculate previous 25% step
        // Math.ceil ensures we find the roof of the current block, then -1 to step down
        let prevPct = (Math.ceil((currentPct - 0.1) / 25) - 1) * 25;
        
        // Cap Min Zoom at 50%
        if (prevPct < 50) prevPct = 50;

        const newScale = (prevPct / 100) * this.baseScale;

        if (Math.abs(newScale - this.currentScale) < 0.001) return;

        this.currentScale = newScale;
        
        // Center Pivot (Reused logic)
        const viewportW = this.scrollWrapper.clientWidth;
        const viewportH = this.scrollWrapper.clientHeight;
        const canvasRect = this.canvas.getBoundingClientRect();
        const wrapperRect = this.scrollWrapper.getBoundingClientRect();
        const wrapperCenterX = wrapperRect.left + (wrapperRect.width / 2);
        const wrapperCenterY = wrapperRect.top + (wrapperRect.height / 2);

        const pivotX = (wrapperCenterX - canvasRect.left) / canvasRect.width;
        const pivotY = (wrapperCenterY - canvasRect.top) / canvasRect.height;

        this.renderPage(this.pageNum, {
            x: pivotX,
            y: pivotY,
            viewerX: viewportW / 2,
            viewerY: viewportH / 2
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    handleResize() {
        if (!this.pdfDoc) return;
        // On resize (or fullscreen change), re-calculate base scale so 100% still fits nicely
        // But we might want to preserve relative current scale? 
        // For simplicity, we stick to the existing logic which resets to "fit width" on resize
        // unless you want to keep the current Zoom level.
        const containerWidth = this.container.clientWidth || 768;
        this.pdfDoc.getPage(this.pageNum).then(p => {
            const unscaled = p.getViewport({scale: 1});
            this.baseScale = containerWidth / unscaled.width;
            
            // If in fullscreen, maybe we want to just refit?
            // Currently keeps behaviour: resets zoom to fit width on resize
            this.currentScale = this.baseScale; 
            this.renderPage(this.pageNum);
        });
    }
}