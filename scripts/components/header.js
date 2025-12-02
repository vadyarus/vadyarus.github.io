const navToggle = document.querySelector('.section__header--nav-toggle');
const navLinks = document.querySelectorAll('.nav__link');

// Only attach listener if the element actually exists
if(navToggle) {
    navToggle.addEventListener('click', ()=>{
        document.body.classList.toggle('nav-open');
    });
}

if(navLinks) {
    navLinks.forEach(link => {
        link.addEventListener('click', ()=>{
            document.body.classList.remove('nav-open');
        })
    });
}

// Resize Animation Stopper
// Prevents the sidebar from "flashing" when resizing between Desktop and Mobile
let resizeTimer;
window.addEventListener('resize', () => {
    document.body.classList.add('resize-animation-stopper');
    // Clear the previous timer so we don't remove the class early
    clearTimeout(resizeTimer);

    // Set a new timer to re-enable transitions 400ms after resizing stops
    resizeTimer = setTimeout(() => {
        document.body.classList.remove('resize-animation-stopper');
    }, 400);
});