/**
 * Helper: Disable Right-Click and Drag on all images to prevent accidental downloads.
 */
function disableImageInteractions() {
    // Prevent Context Menu (Right Click) on images
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });

    // Prevent Dragging on images
    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });
}

document.addEventListener('DOMContentLoaded', async ()=> {
    disableImageInteractions();
});