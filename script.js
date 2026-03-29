// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCnqITLPpjDiEtuA_FH90YtATgZVsX6oOg",
  authDomain: "ovexi-2f197.firebaseapp.com",
  projectId: "ovexi-2f197",
  storageBucket: "ovexi-2f197.firebasestorage.app",
  messagingSenderId: "545150304866",
  appId: "1:545150304866:web:7156a64b44ddc02126073b",
  measurementId: "G-W7W68C38VQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Floating consultation button behavior
(function() {
    const button = document.querySelector('.floating-consultation-button');
    const targetSection = document.getElementById('info-section');

    if (!button || !targetSection) {
        return;
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    let ticking = false;

    function updateFloatingButtonState() {
        const sectionRect = targetSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const fadeRange = viewportHeight * 1.35;

        // As the target section gets closer to the top of the viewport, fade the CTA out.
        const visibility = clamp(sectionRect.top / fadeRange, 0, 1);
        const opacity = 0.08 + visibility * 0.92;
        const scale = 0.9 + visibility * 0.1;

        button.style.opacity = opacity.toFixed(3);
        button.style.setProperty('--consult-scale', scale.toFixed(3));
        button.classList.toggle('is-faded', opacity < 0.16);

        ticking = false;
    }

    function onScrollOrResize() {
        if (ticking) {
            return;
        }
        ticking = true;
        requestAnimationFrame(updateFloatingButtonState);
    }

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    updateFloatingButtonState();
})();

// Scroll reveal animations
(function() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        return;
    }

    const revealMap = [
        { selector: '.section-header', variant: 'reveal' },
        { selector: '.pricing-card', variant: 'reveal reveal-zoom', stagger: 120 },
        { selector: '.why-choose-us h2', variant: 'reveal' },
        { selector: '.slider-wrapper', variant: 'reveal reveal-zoom' },
        { selector: '.contact-form .form-group', variant: 'reveal reveal-right', stagger: 70 },
        { selector: '.contact-form .submit-button', variant: 'reveal reveal-zoom' },
        { selector: '.info-section .container > *', variant: 'reveal', stagger: 90 }
    ];

    const revealElements = [];

    revealMap.forEach(({ selector, variant, stagger = 0 }) => {
        document.querySelectorAll(selector).forEach((element, index) => {
            element.classList.add(...variant.split(' '));
            if (stagger) {
                element.style.setProperty('--reveal-delay', `${index * stagger}ms`);
            }
            revealElements.push(element);
        });
    });

    if (!revealElements.length) {
        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -8% 0px'
    });

    revealElements.forEach((element) => observer.observe(element));
})();


// whyus slider selection
(function() {
        const items = document.querySelectorAll('#featureSlider .feature-item');
        const dots = document.querySelectorAll('.slider-dots .dot');
        let current = 0;
        let autoSlideInterval;
        let startX = 0;
        let isDragging = false;

        function updateSlider(index) {
            items.forEach((item, i) => {
                item.classList.remove('active', 'prev', 'next');
                if (i === index) {
                    item.classList.add('active');
                } else if (i === (index - 1 + items.length) % items.length) {
                    item.classList.add('prev');
                } else if (i === (index + 1) % items.length) {
                    item.classList.add('next');
                }
            });
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
            current = index;
        }

        function nextSlide() {
            updateSlider((current + 1) % items.length);
        }

        function prevSlide() {
            updateSlider((current - 1 + items.length) % items.length);
        }

        function resetAutoSlide() {
            clearInterval(autoSlideInterval);
            autoSlideInterval = setInterval(nextSlide, 10000);
        }

        // Click on dots
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                updateSlider(parseInt(dot.dataset.index));
                resetAutoSlide();
            });
        });

        // Click on items based on their relative position
        items.forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('prev')) {
                    prevSlide();
                } else if (item.classList.contains('next') || item.classList.contains('active')) {
                    nextSlide();
                }
                resetAutoSlide();
            });
        });

        // Swipe / drag support
        const slider = document.getElementById('featureSlider');

        slider.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            slider.style.cursor = 'grabbing';
        });
        slider.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            slider.style.cursor = 'grab';
            const diff = e.clientX - startX;
            if (Math.abs(diff) > 50) {
                diff < 0 ? nextSlide() : prevSlide();
                resetAutoSlide();
            }
        });
        slider.addEventListener('mouseleave', () => {
            isDragging = false;
            slider.style.cursor = 'grab';
        });

        // Touch support
        slider.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        slider.addEventListener('touchend', (e) => {
            const diff = e.changedTouches[0].clientX - startX;
            if (Math.abs(diff) > 50) {
                diff < 0 ? nextSlide() : prevSlide();
                resetAutoSlide();
            }
        });

        // Initialize
        updateSlider(0);
        autoSlideInterval = setInterval(nextSlide, 5000);
    })();

// Package selection
function selectPackage(packageName) {
    const packageSelect = document.getElementById('package');
    const options = packageSelect.options;
    
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === packageName) {
            packageSelect.selectedIndex = i;
            break;
        }
    }
    
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
}

// Initialize EmailJS with your public key (replace with your actual public key)
emailjs.init('MQS1HhxoI6mv2ELHY');

// Form submission
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitButton = this.querySelector('.submit-button');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Küldés...';
    submitButton.disabled = true;
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        package: document.getElementById('package').value,
        message: document.getElementById('message').value
    };
    
    emailjs.send('service_u4n56tq', 'template_1ao10sp', {
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone,
        package: formData.package,
        message: formData.message,
        to_email: 'sandorturai178@gmail.com'
    })
    .then(function() {
        alert('✓ Üzenet sikeresen elküldve! Hamarosan felveszem veled a kapcsolatot.');
        document.getElementById('contactForm').reset();
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }, function(error) {
        alert('✗ Hiba történt az üzenet küldése során. Kérlek próbáld újra később.');
        console.error('EmailJS error:', error);
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    });
});

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
