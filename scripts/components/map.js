import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase (Use your distinct URL and ANON key)
const SUPABASE_URL = 'https://tqfxvsozbeevwmfanqra.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxZnh2c296YmVldndtZmFucXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NTg2ODUsImV4cCI6MjA4MDIzNDY4NX0.fcM7nBDFotBQQHNhDXLRRZywX6unMoe0otdP5LFM-SQ';
const BUCKET_NAME = 'portfolio-images';
const BASE_STORAGE_URL = `https://assets.vadim.guru/${BUCKET_NAME}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function createColoredIcon(color) {
    // A CSS-only pin: a square rotated 45 degrees with 3 rounded corners
    const markerHtmlStyles = `
        background-color: ${color};
        width: 24px;
        height: 24px;
        display: block;
        position: relative;
        border-radius: 50% 50% 0 50%; /* Makes the tear-drop shape */
        transform: rotate(45deg);
        border: 2px solid #FFFFFF;
        box-shadow: 1px 1px 4px rgba(0,0,0,0.4);
    `;
    
    return L.divIcon({
        className: "custom-pin",
        iconAnchor: [12, 34], // Point of the icon which will correspond to marker's location
        popupAnchor: [0, -34], // Point from which the popup should open relative to the iconAnchor
        html: `<span style="${markerHtmlStyles}" />`
    });
}

async function initMap() {
    // 1. Initialize Map centered on a default location (e.g., US)
    // [lat, lng], zoomLevel
    const map = L.map('map').setView([37.0902, -95.7129], 4);

    // 2. Add OpenStreetMap Tile Layer (The "Free" part)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // 3. Fetch Gallery Data from Supabase
    const { data: galleries, error } = await supabase
        .from('galleries')
        .select(`
            title, 
            location, 
            latitude, 
            longitude, 
            id,
            folder,
            category:categories (name, color),
            thumbnail:images!thumb_id (
                thumb,
                section:sections (folder)
            )       
        `) // Join to get thumbnail
        .not('latitude', 'is', null) // Only get entries with coordinates
        .not('longitude', 'is', null);

    if (error) {
        console.error('Error loading map data:', error);
        return;
    }

    // 4. Add Pins (Markers)
    galleries.forEach(gallery => {
        const pinColor = gallery.category?.color || '#3388ff'; // Default Leaflet blue
        const icon = createColoredIcon(pinColor);

        const marker = L.marker([gallery.latitude, gallery.longitude], {icon: icon}).addTo(map);

        let thumbUrl = '';        
        if(gallery.thumbnail) {
            // Determine the folder
            // Priority: Section folder > Gallery folder
            // We use optional chaining (?.) because 'section' might be null in rare cases
            const folder = gallery.thumbnail.section?.folder || gallery.folder;

            // Construct the full URL
            thumbUrl = `${BASE_STORAGE_URL}/${folder}/${gallery.thumbnail.thumb}`;
        }

        const ext = window.PAGE_EXT !== undefined ? window.PAGE_EXT : '';

        const popupContent = `
            <div style="text-align:center; width: 150px;">
                <div style="text-transform: uppercase; font-size: 0.7rem; color: ${pinColor}; font-weight:bold; margin-bottom:4px;">
                    ${gallery.category?.name || 'Gallery'}
                </div>
                <strong>${gallery.title}</strong><br>
                <small>${gallery.location}</small><br>
                ${thumbUrl ? `<img src="${thumbUrl}" style="width:100%; margin-top:5px; border-radius:4px;">` : ''}
                <br>
                <a href="/gallery${ext}?id=${gallery.id}">View Gallery</a>
            </div>
        `;

        marker.bindPopup(popupContent);
    });
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', initMap);