import type { RenderContext } from '../core/renderTypes';

export function renderContactUs(_props: any, _ctx: RenderContext): string {
  return `
    <div class="font-sans text-black bg-white min-h-screen flex flex-col">
        <main class="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-10 border-b border-dotted border-black pb-8">
                <h2 class="font-bold text-sm uppercase mb-2 tracking-wider">Contact Us</h2>
                <h1 class="font-merriweather text-3xl md:text-4xl font-bold leading-tight italic">
                    We'd love to hear from you. Whether it's a <span class="underline decoration-2 underline-offset-4">tip-off, feedback, or a contribution</span>, get in touch.
                </h1>
            </div>

            <div id="contact-form-container" class="mt-12">
                <form id="contact-us-form" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="firstName" class="block text-sm font-bold uppercase tracking-wider mb-2">First Name</label>
                            <input type="text" id="firstName" name="firstName" required class="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12">
                        </div>
                        <div>
                            <label for="lastName" class="block text-sm font-bold uppercase tracking-wider mb-2">Last Name</label>
                            <input type="text" id="lastName" name="lastName" required class="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label for="phoneNumber" class="block text-sm font-bold uppercase tracking-wider mb-2">Phone Number</label>
                            <input type="tel" id="phoneNumber" name="phoneNumber" required class="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12">
                        </div>
                        <div>
                            <label for="email" class="block text-sm font-bold uppercase tracking-wider mb-2">Email</label>
                            <input type="email" id="email" name="email" required class="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12">
                        </div>
                    </div>

                    <div>
                        <label for="topic" class="block text-sm font-bold uppercase tracking-wider mb-2">What is this about?</label>
                        <select id="topic" name="topic" class="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12 bg-white appearance-none" style="background-image: url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'currentColor\\'%3E%3Cpath stroke-line-cap=\\'round\\' stroke-line-join=\\'round\\' stroke-width=\\'2\\' d=\\'M19 9l-7 7-7-7\\' /%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.5em">
                            <option value="tip-off">Tip-off</option>
                            <option value="feedback">Feedback</option>
                            <option value="contribute">Contribute</option>
                            <option value="complaint">Complaint</option>
                        </select>
                    </div>

                    <div>
                        <label for="message" class="block text-sm font-bold uppercase tracking-wider mb-2">Write your message</label>
                        <textarea id="message" name="message" required rows="6" class="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none resize-none"></textarea>
                    </div>

                    <div class="text-center">
                        <button type="submit" class="w-full md:w-auto border border-black bg-black text-white px-12 py-4 uppercase tracking-widest text-sm font-bold hover:bg-white hover:text-black transition-colors rounded-none">
                            Submit
                        </button>
                    </div>
                    
                    <input type="hidden" id="receiverEmail" value="${_props.receiverEmail || ''}" />
                </form>
            </div>

            <div id="thank-you-message" class="hidden mt-12 border border-black p-12 text-center">
                <h2 class="font-merriweather text-3xl font-bold mb-4 italic">Thank you!</h2>
                <p class="text-lg">Your message has been sent. We'll get back to you soon.</p>
                <button id="send-another" class="mt-8 border border-black px-6 py-2 uppercase tracking-widest text-sm font-bold hover:bg-black hover:text-white transition-colors">
                    Send another message
                </button>
            </div>
        </main>
        
        <script>
            (function() {
                const form = document.getElementById('contact-us-form');
                const formContainer = document.getElementById('contact-form-container');
                const thankYou = document.getElementById('thank-you-message');
                const sendAnother = document.getElementById('send-another');

                if (form) {
                    form.addEventListener('submit', async function(e) {
                        e.preventDefault();
                        
                        const formData = {
                            firstName: document.getElementById('firstName').value,
                            lastName: document.getElementById('lastName').value,
                            phoneNumber: document.getElementById('phoneNumber').value,
                            email: document.getElementById('email').value,
                            topic: document.getElementById('topic').value,
                            message: document.getElementById('message').value,
                            receiverEmail: document.getElementById('receiverEmail') ? document.getElementById('receiverEmail').value : ''
                        };

                        try {
                            const BACKEND_BASE = "${(import.meta as any).env?.VITE_BACKEND_API || ""}";
                            const targetUrl = BACKEND_BASE + '/contact/submit';

                            const response = await fetch(targetUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(formData),
                            });

                            if (response.ok) {
                                formContainer.classList.add('hidden');
                                thankYou.classList.remove('hidden');
                                window.scrollTo(0, 0);
                            } else {
                                alert('Failed to send message. Please try again.');
                            }
                        } catch (error) {
                            console.error('Submission error:', error);
                            alert('An error occurred. Please try again later.');
                        }
                    });
                }

                if (sendAnother) {
                    sendAnother.addEventListener('click', function() {
                        form.reset();
                        thankYou.classList.add('hidden');
                        formContainer.classList.remove('hidden');
                    });
                }
            })();
        </script>
    </div>
  `;
}
