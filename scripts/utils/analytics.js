document.addEventListener('click', function(e){
    if(e.target.tagName.toLowerCase() != 'a'){
        return;
    }
    gtag('event', 'link_click', {
        'link_text': e.target.innerText,
        'link_url': e.target.href,
        'link_id': e.target.id,
        'link_classes': e.target.className
    });
});