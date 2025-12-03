const SUPABASE_URL = 'https://tqfxvsozbeevwmfanqra.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnh2c296YmVldndtZmFucXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NTg2ODUsImV4cCI6MjA4MDIzNDY4NX0.fcM7nBDFotBQQHNhDXLRRZywX6unMoe0otdP5LFM-SQ';
const BUCKET_NAME = 'portfolio-images';
const BASE_STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadIndexGalleries() {
    const container = document.getElementById('my-work-grid');
    if(container === null) return;

    // Fetch Categories
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

    if(catError) {
        console.error("Error fetching categories:", catError);
        return;
    }

    // Fetch Galleries and the linked Thumbnail Image
    // We filter out any galleries that might not have images yet to avoid broken links
    const { data: galleries, galError } = await supabase
        .from('galleries')
        .select(`
            id,
            title,
            location,
            folder,
            category_id,
            thumbnail:images!thumb_id (
                thumb,
                section:sections (folder)
            )
        `)
        .order('title', { ascending: true }); // Alphabetical inside the category

    if(galError) {
        console.error("Error fetching galleries:", galError);
        return;
    }

    console.log(galleries);

    // Clear existing hardcoded content
    container.innerHTML = '';

    categories.forEach(category => {
        // Filter galleries that belong to this category
        const categoryGalleries = galleries.filter(g => g.category_id === category.id);

        // Don't show empty categories
        if(categoryGalleries.length === 0) return;

        // Category Title
        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'section__subtitle--gallery';
        categoryTitle.innerText = category.name;
        container.appendChild(categoryTitle);

        // Grid Container
        const gridDiv = document.createElement('div');
        gridDiv.className = 'portfolio';

        // Cards
        categoryGalleries.forEach(gallery => {
            let imgUrl = 'https://placehold.co/640x360'; // Default placeholder

            if(gallery.thumbnail) {
                // Determine the folder
                // Priority: Section folder > Gallery folder
                // We use optional chaining (?.) because 'section' might be null in rare cases
                const folder = gallery.thumbnail.section?.folder || gallery.folder;

                // Construct the full URL
                // e.g. https://.../public/portfolio-images/my_folder_my_thumb.jpg
                imgUrl = `${BASE_STORAGE_URL}/${folder}/${gallery.thumbnail.thumb}`;
            }

            const link = document.createElement('a');
            link.className = 'portfolio__item';
            link.href = `/gallery.html?id=${gallery.id}`;

            const locationHTML = gallery.location
                ? `<span style="font-size: 0.8em; font-weight: normal;">${gallery.location}</span>`
                : '';

            link.innerHTML = `
                <img src="${imgUrl}" alt="${gallery.title}" class="portfolio__img"/>
                <p class="portfolio__item_alt">
                    <strong>${gallery.title || 'Untitled Gallery'}</strong>
                    <br>
                    ${locationHTML}
                </p>
            `;

            gridDiv.appendChild(link);
        });

        container.appendChild(gridDiv);
    });
}

loadIndexGalleries();