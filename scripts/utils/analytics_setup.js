// Initialize DataLayer
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

var gtag_id = 'G-HNHD3090QK';

gtag('js', new Date());

// Check User ID (Relies on cookie_utils.js being loaded first)
if(typeof check_user_id === 'function') {
    check_user_id();
    const user_id = getCookie('user_id');

    // GA4 automatically tracks page_title and location from the document
    // We just need to set the config and user properties
    gtag('config', gtag_id, {
        'user_id': user_id,
        'currency': 'USD'
    });
}
else {
    console.warn('cookie_utils.js should be loaded before analytics_setup.js');
    gtag('config', gtag_id);
}