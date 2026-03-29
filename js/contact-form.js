document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const packageSelection = document.getElementById('package').value;
        const details = document.getElementById('details').value;

        if (validateForm(name, email, packageSelection, details)) {
            sendEmail(name, email, packageSelection, details);
        } else {
            alert('Please fill in all fields correctly.');
        }
    });

    function validateForm(name, email, packageSelection, details) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return name && emailPattern.test(email) && packageSelection && details;
    }

    function sendEmail(name, email, packageSelection, details) {
        // Here you would typically send the email using an API or a service
        console.log('Email sent with the following details:');
        console.log(`Name: ${name}`);
        console.log(`Email: ${email}`);
        console.log(`Selected Package: ${packageSelection}`);
        console.log(`Details: ${details}`);
        
        alert('Your inquiry has been sent successfully!');
        contactForm.reset();
    }
});