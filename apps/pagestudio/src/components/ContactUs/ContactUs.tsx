import { useState } from 'react';

export const ContactUs = ({ receiverEmail }: { receiverEmail?: string }) => {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        topic: 'feedback',
        message: ''
    });

    // Reported through the studio toast (the editor canvas must never open browser dialogs or scroll the page).
    const notify = (message: string) =>
        window.dispatchEvent(new CustomEvent('studio:notice', { detail: { tone: 'error', title: 'Message not sent', message } }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const base = (import.meta as any).env.VITE_BACKEND_API;
            
            // Include receiverEmail from props into the payload
            const payload = {
                ...formData,
                receiverEmail: receiverEmail 
            };            
            const response = await fetch(`${base}/contact/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setSubmitted(true);
            } else {
                const errorData = await response.json();
                notify(errorData.message || 'Something went wrong');
            }
        } catch (error) {
            console.error('Submission error:', error);
            notify('Failed to send message. Please try again later.');
        }
    };

    if (submitted) {
        return (
            <div className="font-sans text-black bg-white min-h-[60vh] flex flex-col items-center justify-center px-4">
                <div className="max-w-md w-full border border-black p-12 text-center">
                    <h2 className="font-merriweather text-3xl font-bold mb-4 italic">Thank you!</h2>
                    <p className="text-lg">Your message has been sent. We'll get back to you soon.</p>
                    <button 
                        onClick={() => setSubmitted(false)}
                        className="mt-8 border border-black px-6 py-2 uppercase tracking-widest text-sm font-bold hover:bg-black hover:text-white transition-colors"
                    >
                        Send another message
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="font-sans text-black bg-white min-h-screen flex flex-col">
            <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-10 border-b border-dotted border-black pb-8">
                    <h2 className="font-bold text-sm uppercase mb-2 tracking-wider">Contact Us</h2>
                    <h1 className="font-merriweather text-3xl md:text-4xl font-bold leading-tight italic">
                        We'd love to hear from you. Whether it's a <span className="underline decoration-2 underline-offset-4">tip-off, feedback, or a contribution</span>, get in touch.
                    </h1>
                </div>

                <div className="mt-12">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-bold uppercase tracking-wider mb-2">First Name</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12"
                                />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-bold uppercase tracking-wider mb-2">Last Name</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="phoneNumber" className="block text-sm font-bold uppercase tracking-wider mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    required
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    className="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wider mb-2">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="topic" className="block text-sm font-bold uppercase tracking-wider mb-2">What is this about?</label>
                            <select
                                id="topic"
                                name="topic"
                                value={formData.topic}
                                onChange={handleChange}
                                className="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none h-12 bg-white appearance-none"
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-line-cap=\'round\' stroke-line-join=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em' }}
                            >
                                <option value="tip-off">Tip-off</option>
                                <option value="feedback">Feedback</option>
                                <option value="contribute">Contribute</option>
                                <option value="complaint">Complaint</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-bold uppercase tracking-wider mb-2">Write your message</label>
                            <textarea
                                id="message"
                                name="message"
                                required
                                rows={6}
                                value={formData.message}
                                onChange={handleChange}
                                className="w-full border border-black p-3 focus:outline-none focus:ring-1 focus:ring-black rounded-none resize-none"
                            ></textarea>
                        </div>

                        <div className="text-center">
                            <button
                                type="submit"
                                className="w-full md:w-auto border border-black bg-black text-white px-12 py-4 uppercase tracking-widest text-sm font-bold hover:bg-white hover:text-black transition-colors rounded-none"
                            >
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};
