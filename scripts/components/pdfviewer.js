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

        // DOM Elements (assigned in init)
        this.canvas = null;
        this.ctx = null;
        this.scrollWrapper = null;
        this.zoomDisplay = null;
        this.pageCountDisplay = null;
        this.pageNumDisplay = null;

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
                <button data-action="prev" class="pdf-button" title="Previous Page"><i class="fa-solid fa-angle-left"></i> Prev</button>
                
                <span class="pdf-page-info">
                    Page <span id="pdf-page-num">1</span> of <span id="pdf-page-count">--</span>
                </span>
                
                <button data-action="next" class="pdf-button" title="Next Page">Next <i class="fa-solid fa-angle-right"></i></button>
                
                <div class="pdf-zoom-controls" style="margin-left: 1rem; display:inline-block;">
                    <button data-action="zoom-out" class="pdf-button" title="Zoom Out"><i class="fa-solid fa-minus"></i></button>
                    <span id="pdf-zoom-level">100%</span>
                    <button data-action="zoom-in" class="pdf-button" title="Zoom In"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
            
            <div id="pdf-scroll-wrapper" class="pdf-scroll-wrapper">
                <canvas id="pdf-canvas" class="pdf-canvas"></canvas>
            </div>
        `;

        // Cache DOM references
        this.canvas = this.container.querySelector('#pdf-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scrollWrapper = this.container.querySelector('#pdf-scroll-wrapper');
        this.zoomDisplay = this.container.querySelector('#pdf-zoom-level');
        this.pageCountDisplay = this.container.querySelector('#pdf-page-count');
        this.pageNumDisplay = this.container.querySelector('#pdf-page-num');
    }

    async loadDocument() {
        try {
            // PDF.js global must be available
            if (window.pdfjsLib === null) throw new Error("PDF.js library not loaded");

            this.pdfDoc = await window.pdfjsLib.getDocument(this.url).promise;
            this.pageCountDisplay.textContent = this.pdfDoc.numPages;

            // Calculate initial "Fit Width" scale
            const page = await this.pdfDoc.getPage(1);
            const containerWidth = this.container.clientWidth || 800;
            const unscaledViewport = page.getViewport({ scale: 1 });
            
            // Set base scale
            this.baseScale = containerWidth / unscaledViewport.width;
            this.currentScale = this.baseScale;

            this.renderPage(this.pageNum);
        } catch (err) {
            console.error("Error loading PDF:", err);
            this.container.innerHTML = `<p>Error loading drawings. <a href="${this.url}">Download here</a>.</p>`;
        }
    }

    renderPage(num) {
        this.pageRendering = true;

        this.pdfDoc.getPage(num).then((page) => {
            const viewport = page.getViewport({ scale: this.currentScale });

            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;

            // Update UI
            const percentage = Math.round((this.currentScale / this.baseScale) * 100);
            this.zoomDisplay.textContent = `${percentage}%`;
            this.pageNumDisplay.textContent = num;

            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };

            const renderTask = page.render(renderContext);

            renderTask.promise.then(() => {
                this.pageRendering = false;
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

    // --- INTERACTION HANDLERS ---

    addEventListeners() {
        // Disable Right Click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Button Delegation
        this.container.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            if (action === 'prev') this.prevPage();
            if (action === 'next') this.nextPage();
            if (action === 'zoom-in') this.zoomIn();
            if (action === 'zoom-out') this.zoomOut();
        });

        // Window Resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 200);
        });

        // Panning Logic
        this.initPanLogic();
    }

    initPanLogic() {
        const slider = this.scrollWrapper;

        slider.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            slider.classList.add('grabbing');
            this.startPan.x = e.pageX - slider.offsetLeft;
            this.startPan.y = e.pageY - slider.offsetTop;
            this.scrollPos.left = slider.scrollLeft;
            this.scrollPos.top = slider.scrollTop;
        });

        slider.addEventListener('mouseleave', () => {
            this.isDragging = false;
            slider.classList.remove('grabbing');
        });

        slider.addEventListener('mouseup', () => {
            this.isDragging = false;
            slider.classList.remove('grabbing');
        });

        slider.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const y = e.pageY - slider.offsetTop;
            const walkX = (x - this.startPan.x) * 2; 
            const walkY = (y - this.startPan.y) * 2;
            slider.scrollLeft = this.scrollPos.left - walkX;
            slider.scrollTop = this.scrollPos.top - walkY;
        });
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
        this.currentScale += 0.25;
        this.renderPage(this.pageNum);
    }

    zoomOut() {
        if (this.currentScale <= 0.25) return;
        this.currentScale -= 0.25;
        this.renderPage(this.pageNum);
    }

    handleResize() {
        if (!this.pdfDoc) return;
        
        // Recalculate base scale
        const containerWidth = this.container.clientWidth || 800;
        this.pdfDoc.getPage(this.pageNum).then(p => {
            const unscaled = p.getViewport({scale: 1});
            this.baseScale = containerWidth / unscaled.width;
            
            // Optional: Reset zoom on resize, or maintain ratio
            this.currentScale = this.baseScale; 
            this.renderPage(this.pageNum);
        });
    }
}