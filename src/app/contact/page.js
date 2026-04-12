'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: hook up to email service later
    setSubmitted(true);
  };

  return (
    <div style={{ paddingTop: '70px' }}>

      {/* HERO */}
      <section style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A0A 50%, #0A0A0A 100%)',
      }}>
        <p className="section-label">Get In Touch</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Contact Us</h1>
        <div className="divider-gold" />
        <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
          Have questions about our products or need assistance with your order? We're here to help.
        </p>
      </section>

      {/* CONTACT GRID */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '5rem', alignItems: 'start' }}>

          {/* LEFT — Info */}
          <div>
            <p className="section-label" style={{ marginBottom: '2rem' }}>Our Details</p>

            {[
              {
                label: 'Our Location',
                value: 'SBDC Building, 2 Columbus Rd\nVerulam, Unit 13',
                icon: '📍',
              },
              {
                label: 'Email Us',
                value: 'info@randragencies.online',
                icon: '✉️',
                href: 'mailto:info@randragencies.online',
              },
              {
                label: 'Call Us',
                value: '081 336 5266',
                icon: '📞',
                href: 'tel:+27813365266',
              },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex',
                gap: '1.25rem',
                marginBottom: '2.5rem',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  fontSize: '1.2rem',
                  width: '45px',
                  height: '45px',
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{ fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '0.4rem' }}>
                    {item.label}
                  </p>
                  {item.href ? (
                    <a href={item.href} style={{ fontSize: '0.85rem', color: '#ccc', textDecoration: 'none', lineHeight: 1.6 }}
                      onMouseEnter={e => e.target.style.color = '#C9A84C'}
                      onMouseLeave={e => e.target.style.color = '#ccc'}
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Business hours */}
            <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '2rem', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1rem' }}>
                Business Hours
              </p>
              {[
                { day: 'Monday – Friday', hours: '8:00 AM – 5:00 PM' },
                { day: 'Saturday', hours: '9:00 AM – 2:00 PM' },
                { day: 'Sunday', hours: 'Closed' },
              ].map(h => (
                <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <p style={{ fontSize: '0.78rem', color: '#888' }}>{h.day}</p>
                  <p style={{ fontSize: '0.78rem', color: h.hours === 'Closed' ? '#555' : '#ccc' }}>{h.hours}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Form */}
          <div style={{
            border: '1px solid rgba(201,168,76,0.2)',
            padding: '3rem',
            background: '#0F0F0F',
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✉️</div>
                <h3 style={{ fontSize: '1.8rem', color: '#C9A84C', marginBottom: '1rem' }}>Message Sent</h3>
                <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
                <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.8 }}>
                  Thank you for reaching out. We'll get back to you as soon as possible.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', message: '' }); }}
                  className="btn-outline-gold"
                  style={{ marginTop: '2rem', cursor: 'pointer', border: '1px solid #C9A84C' }}
                >
                  Send Another
                </button>
              </div>
            ) : (
              <>
                <p className="section-label" style={{ marginBottom: '0.5rem' }}>Send a Message</p>
                <h2 style={{ fontSize: '1.8rem', color: '#F5F0E8', marginBottom: '2rem' }}>We'd Love to Hear From You</h2>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: '0.5rem' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                    style={{
                      width: '100%',
                      background: '#1A1A1A',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: '#F5F0E8',
                      padding: '0.85rem 1rem',
                      fontSize: '0.82rem',
                      fontFamily: 'Montserrat, sans-serif',
                      outline: 'none',
                      letterSpacing: '0.03em',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: '0.5rem' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    style={{
                      width: '100%',
                      background: '#1A1A1A',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: '#F5F0E8',
                      padding: '0.85rem 1rem',
                      fontSize: '0.82rem',
                      fontFamily: 'Montserrat, sans-serif',
                      outline: 'none',
                      letterSpacing: '0.03em',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', display: 'block', marginBottom: '0.5rem' }}>
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    placeholder="How can we help you?"
                    rows={5}
                    style={{
                      width: '100%',
                      background: '#1A1A1A',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: '#F5F0E8',
                      padding: '0.85rem 1rem',
                      fontSize: '0.82rem',
                      fontFamily: 'Montserrat, sans-serif',
                      outline: 'none',
                      letterSpacing: '0.03em',
                      resize: 'vertical',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C9A84C'}
                    onBlur={e => e.target.style.borderColor = 'rgba(201,168,76,0.2)'}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  className="btn-gold"
                  style={{ width: '100%', cursor: 'pointer', border: 'none' }}
                >
                  Send Message
                </button>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}