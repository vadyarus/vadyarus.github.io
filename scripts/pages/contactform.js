const form = document.getElementById('contact-form');
const submitButton = form.querySelector('input[type="submit"]');
const retryButton = document.getElementById('retry-button');

function onSuccess(json) {
    console.log('[Contact Form] SUCCESS!');    
    console.log(json);
    
    // UI Updates    
    form.classList.add('hidden');
    document.getElementById('contact-success').classList.remove('hidden');    
    
    // Google Analytics contact success event
    if(typeof gtag === 'function') {
        gtag('event', 'contact_success');
        
        // Safety check for form elements before accessing value
        const num = form.querySelector('input[name="contact_number"]');
        const name = form.querySelector('input[name="contact_name"]');
        const email = form.querySelector('input[name="contact_email"]');

        // Parse the form fields
        gtag('set', 'user_properties', {
            'crm_id': num ? num.value : 'unknown',
            'crm_name': name ? name.value : 'unknown',
            'crm_email': email ? email.value : 'unknown'                    
        });
    }
}

function onFailure(error) {
    console.log('[Contact Form] FAILED...', error);
    
    // Google Analytics contact failed event
    if(typeof gtag === 'function') {
        gtag('event', 'exception', {
            'description': String(error),
            'fatal': false
        });
    }

    // UI Updates
    form.classList.add('hidden');
    document.getElementById('contact-failed').classList.remove('hidden');
    document.getElementById('response-code').innerText = error;
}

retryButton.addEventListener('click', function(){
    // Hide the error section
    document.getElementById('contact-failed').classList.add('hidden');

    // Show the form again
    form.classList.remove('hidden');

    // Reset hCaptcha
    if (typeof hcaptcha !== 'undefined') {
        hcaptcha.reset();
    }
});

form.addEventListener('submit', async(e)=>{
    e.preventDefault();    
    console.log('[Contact Form] Submitting...');

    // Google Analytics
    if(typeof gtag === 'function') {
        gtag('event', 'contact_submit');
    }
    
    const formData = new FormData(form);
    formData.append("access_key", "cb91da17-4db7-4cc9-a02a-9048145319a9");    

    if(typeof getCookie === 'function') {
        // grab the user_id cookie for the contact_number value
        formData.set("contact_number", getCookie('user_id'));
    }
        
    // UI Loading State   
    const originalText = submitButton.value;   
    submitButton.value = 'Sending...';
    submitButton.disabled = true;

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });

        const json = await response.json();

        if(response.status == 200) {
            onSuccess(json);
        }
        else {
            onFailure(json.message || 'Something went wrong!');
        }
    }
    catch (error) {
        onFailure(error);
    }
    finally {
        submitButton.value = originalText;
        submitButton.disabled = false;
    }    
});

window.addEventListener('load', function(){
    // Reset hCaptcha if it exists to ensure a fresh token
    if (typeof hcaptcha !== 'undefined') {
        hcaptcha.reset();
    }
});