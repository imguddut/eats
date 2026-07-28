import { useState, FormEvent } from 'react';
import { Mail, Phone, MessageSquare, MapPin, CheckCircle2, Send, Clock } from 'lucide-react';
import { saveContactMessage } from '../services/dbSimulator';

export default function ContactView() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Save the message securely in the DB engine
    saveContactMessage({ name, email, subject, message });

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 1500);
  };

  return (
    <div id="contact-view" className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-16 space-y-12">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-4xl font-black text-brand-text">Get In Touch</h1>
        <p className="text-sm text-brand-text-sec font-semibold max-w-lg mx-auto leading-relaxed">
          Have an inquiry, feedback, or party order request? Reach out to the ArwalEats delivery support team immediately!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Contact Form Container */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-brand-card shadow-sm space-y-6">
          <div className="border-b border-brand-card/40 pb-2">
            <h3 className="font-display font-bold text-lg text-brand-text">Send Us A Message</h3>
            <p className="text-xs text-brand-text-sec font-semibold">We typically reply within 1-2 hours</p>
          </div>

          {submitted ? (
            <div className="p-6 bg-brand-success/10 border border-brand-success/30 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="text-brand-success mx-auto" size={36} />
              <h4 className="font-display font-bold text-sm text-brand-text">Message Sent Successfully!</h4>
              <p className="text-xs text-brand-text-sec font-semibold leading-relaxed">
                Thank you for contacting ArwalEats! Our customer satisfaction team will read and respond to your email shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold text-brand-accent hover:underline cursor-pointer"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent"
                  placeholder="E.g., Catering Request"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-brand-card bg-brand-bg text-xs font-semibold focus:outline-none focus:border-brand-accent resize-none"
                  placeholder="Type your message inside..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold text-xs rounded-xl shadow-md shadow-brand-accent/20 cursor-pointer flex items-center justify-center gap-1.5 transition-colors disabled:opacity-75"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={14} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          {/* Quick Contacts Panel */}
          <div className="bg-brand-bg-sec/50 border border-brand-card p-6 rounded-3xl space-y-4">
            <h3 className="font-display font-bold text-base text-brand-text">Direct Contact details</h3>
            
            <div className="space-y-3.5 text-xs text-brand-text-sec font-semibold">
              <div className="flex items-center gap-2.5">
                <Phone className="text-brand-accent shrink-0" size={16} />
                <span>+91 81021 23746</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="text-brand-accent shrink-0" size={16} />
                <span>arwaleats@gmail.com</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Clock className="text-brand-accent shrink-0" size={16} />
                <span>Open Hours: 11:00 AM - 11:00 PM (Daily)</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <a
                href="https://wa.me/918102123746"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <MessageSquare size={14} />
                WhatsApp Chat Support
              </a>
              <a
                href="tel:+918102123746"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-brand-card hover:border-brand-accent bg-white text-brand-text font-bold text-xs transition-colors"
              >
                <Phone size={14} />
                Call Arwal Helpline
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
