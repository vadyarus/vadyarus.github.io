import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.min.js';
// --- CONFIGURATION ---
const SUPABASE_URL = 'https://tqfxvsozbeevwmfanqra.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnh2c296YmVldndtZmFucXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NTg2ODUsImV4cCI6MjA4MDIzNDY4NX0.fcM7nBDFotBQQHNhDXLRRZywX6unMoe0otdP5LFM-SQ';
const IMAGES_BUCKET_NAME = 'portfolio-images';
const IMAGES_STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/${IMAGES_BUCKET_NAME}`;

const DRAWINGS_BUCKET_NAME = 'portfolio-drawings';
const DRAWINGS_STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/${DRAWINGS_BUCKET_NAME}`;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Get the Gallery ID from the URL parameters
const urlParams = new URLSearchParams(window.location.search);
const galleryID = urlParams.get('id');

function getYouTubeID(url) {
    // Regex to extract the ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

async function loadGallery() {
    // FETCH DEEP DATA
    // Select Gallery -> Sections -> Images
    const { data: gallery, error } = await supabase
        .from('galleries')
        .select(`
            *,
            sections (
                *,
                images (*)
            )
        `)
        .eq('id', galleryID)
        .single();

    if(error) {
        console.error("Error fetching gallery data:", error);
        renderErrorState();
        return;
    }

    // SORTING
    // Sort sectins by `sort_order` field
    if(gallery.sections) {
        gallery.sections.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        // Sort Images within each section by `sort_order` field
        gallery.sections.forEach(section => {
            if(section.images) {
                section.images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            }
        });        
    }

    // RENDER METADATA
        const titleElement = document.getElementById('gallery-title');
        const locationElement = document.getElementById('gallery-location');

        if(titleElement) titleElement.innerText = gallery.title || 'Untitled Gallery';
        if(locationElement) locationElement.innerText = gallery.location || '';

    // RENDER VIDEO IF EXISTS
        if(gallery.video) {
            const videoContainer = document.getElementById('gallery-video-container');

        // Check if the string looks like a YouTube URL
        const youtubeID = getYouTubeID(gallery.video);

        if(youtubeID) {
            videoContainer.innerHTML = `
                <iframe
                    class="portfolio__video"
                    src="https://www.youtube.com/embed/${youtubeID}?rel=0&controls=1&autoplay=1&mute=1&iv_load_policy=3&modestbranding=1"
                    title="YouTube video player"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen>
                </iframe>
            `;
        }
        else {
            videoContainer.innerHTML = `
                <video class="portfolio__video" controls oncontextmenu="return false;">
                    <source id="gallery-video-source" src="" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            `;
            const videoSource = document.getElementById('gallery-video-source');
            videoSource.src = `${IMAGES_STORAGE_URL}/${gallery.folder}/${gallery.video}`;
            videoContainer.querySelector('video').load();
        }
        
            videoContainer.style.display = 'block';
        }                

        // Generate Gallery Grid(s)
        const contentRoot = document.getElementById('gallery-content-root');

        gallery.sections.forEach(section => {
        // Section Title
            if(section.title) {
                const subTitle = document.createElement('h3');
                subTitle.className = 'section__subtitle--gallery';
                subTitle.innerText = section.title;
                contentRoot.appendChild(subTitle);
            }

        // Grid Container
            const grid = document.createElement('div');
            grid.className = 'portfolio pswp-gallery';
            grid.id = 'gallery-' + Math.random().toString(36).substring(2, 9); // Unique ID

            // Determine Image folder (override if section has specific folder)
            const imgFolder = section.folder ? section.folder : gallery.folder;

            // Generate HTML for images
            let imagesHTML = '';

        // Safety check if images exist
        if(section.images && section.images.length > 0) {
            section.images.forEach(img => {
                const fullSrc = `${IMAGES_STORAGE_URL}/${imgFolder}/${img.src}`;
                const thumbSrc = `${IMAGES_STORAGE_URL}/${imgFolder}/${img.thumb}`;

                imagesHTML += `
                    <a class="portfolio__item"
                        href="${fullSrc}"
                        data-pswp-width="${img.width}"
                        data-pswp-height="${img.height}"
                        target="_blank">
                        <img class="portfolio__img example-image" src="${thumbSrc}" alt="${img.alt || ''}">
                        <p class="portfolio__item_alt">${img.alt || ''}</p>
                    </a>
                `;
            });
        }

            grid.innerHTML = imagesHTML;
            contentRoot.appendChild(grid);
        });

    initLightbox();
}
       
function initLightbox() {    
        // Initialize PhotoSwipe Lightbox
        const lightbox = new PhotoSwipeLightbox({
            gallery: '.pswp-gallery',
            children: 'a',
            pswpModule: PhotoSwipe,
        });

        // Register custom caption element (Top Bar)
        lightbox.on('uiRegister', function() {
            lightbox.pswp.ui.registerElement({
                name: 'custom-caption',
                order: 7,
                isButton: false,
                appendTo: 'bar',
                html: '',
                onInit: (el, pswp) => {
                    lightbox.pswp.on('change', ()=>{
                        const currSlideElement = lightbox.pswp.currSlide.data.element;
                        let captionHTML = '';
                        if (currSlideElement) {
                            const img = currSlideElement.querySelector('img');
                            if (img) {
                                captionHTML = img.getAttribute('alt');
                            }
                        }
                        el.innerHTML = captionHTML || '';
                    });
                }
            });
        });

        lightbox.init();
}

function renderErrorState() {
        const titleElement = document.getElementById('gallery-title');
        const contentRoot = document.getElementById('gallery-content-root');
        if(titleElement) titleElement.innerText = 'Gallery Not Found';
        if(contentRoot) {
        contentRoot.innerHTML = `<p style="text-align:center; margin-top:2em;">
            We couldn't find the data for "${galleryID}".
        </p>`;
        }
}

loadGallery();