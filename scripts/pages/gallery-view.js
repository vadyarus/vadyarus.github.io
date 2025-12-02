import PhotoSwipeLightbox from '/vendor/PhotoSwipe-5.2.2/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from '/vendor/PhotoSwipe-5.2.2/photoswipe.esm.min.js';

// Get the Gallery ID from the URL parameters
const urlParams = new URLSearchParams(window.location.search);
const galleryID = urlParams.get('id');

// Construct the path to the specific JSON file
const jsonPath = '/data/galleries/' + galleryID + '.json';

fetch(jsonPath)
    .then(response => {
        if(response.ok === false) {
            throw new Error("Gallery not found");
        }
        return response.json();
    })
    .then(gallery => {
        // Populate Title and Location
        const titleElement = document.getElementById('gallery-title');
        const locationElement = document.getElementById('gallery-location');

        if(titleElement) titleElement.innerText = gallery.title || 'Untitled Gallery';
        if(locationElement) locationElement.innerText = gallery.location || '';

        if(gallery.video) {
            const videoContainer = document.getElementById('gallery-video-container');
            const videoSource = document.getElementById('gallery-video-source');
            // Use section specific folder if provided, otherwise default to gallery folder
            videoSource.src = `./images/${gallery.folder}/${gallery.video}`;
            videoContainer.querySelector('video').load();
            videoContainer.style.display = 'block';
        }                

        // Generate Gallery Grid(s)
        const contentRoot = document.getElementById('gallery-content-root');

        gallery.sections.forEach(section => {
            // Create Section Title if it exists
            if(section.title) {
                const subTitle = document.createElement('h3');
                subTitle.className = 'section__subtitle--gallery';
                subTitle.innerText = section.title;
                contentRoot.appendChild(subTitle);
            }

            // Create Grid Container
            const grid = document.createElement('div');
            grid.className = 'portfolio pswp-gallery';
            grid.id = 'gallery-' + Math.random().toString(36).substring(2, 9); // Unique ID

            // Determine Image folder (override if section has specific folder)
            const imgFolder = section.folder ? section.folder : gallery.folder;

            // Generate HTML for images
            let imagesHTML = '';
            section.images.forEach(img => {
                imagesHTML += `
                    <a class="portfolio__item"
                        href="/images/${imgFolder}/${img.src}"
                        data-pswp-width="${img.width}"
                        data-pswp-height="${img.height}"
                        target="_blank">
                        <img class="portfolio__img example-image" src="/images/${imgFolder}/${img.thumb}" alt="${img.alt || ''}">
                        <p class="portfolio__item_alt">${img.alt || ''}</p>
                    </a>
                `;
            });

            grid.innerHTML = imagesHTML;
            contentRoot.appendChild(grid);
        });

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
    })
    .catch(error => {
        console.error('Error loading gallery:', error);

        const titleElement = document.getElementById('gallery-title');
        const locationElement = document.getElementById('gallery-location');
        const contentRoot = document.getElementById('gallery-content-root');

        if(titleElement) titleElement.innerText = 'Gallery Not Found';
        if(locationElement) locationElement.innerText = '';
        
        if(contentRoot) {
            contentRoot.innerHTML = `
            <p style="text-align:center; margin-top:2em;">We couldn't find the data for "${galleryID}".</p>
            `;
        }
    });
            