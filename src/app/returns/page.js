'use client';

import Link from 'next/link';

export default function ReturnsPage() {
  return (
    <div style={{ paddingTop: '70px' }}>

      {/* HERO */}
      <section style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A0A 50%, #0A0A0A 100%)',
      }}>
        <p className="section-label">Policies</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#F5F0E8', marginTop: '0.5rem' }}>Refund & Returns</h1>
        <div className="divider-gold" />
        <p style={{ fontSize: '0.85rem', color: '#999', maxWidth: '500px', margin: '0 auto', lineHeight: 1.9 }}>
          Your satisfaction is our priority. Please read our policy carefully before making a purchase.
        </p>
      </section>

      {/* CONTENT */}
      <section style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto' }}>

        {[
          {
            title: 'Overview',
            content: 'Our refund and returns policy lasts 30 days. If 30 days have passed since your purchase, we cannot offer you a full refund or exchange. To be eligible for a return, your item must be unused and in the same condition that you received it. It must also be in the original packaging. To complete your return, we require a receipt or proof of purchase.',
          },
          {
            title: 'Refunds',
            content: 'Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund. If you are approved, your refund will be processed and a credit will automatically be applied to your credit card or original method of payment within a certain number of days.',
          },
          {
            title: 'Late or Missing Refunds',
            content: "If you haven't received a refund yet, first check your bank account again. Then contact your credit card company — it may take some time before your refund is officially posted. Next, contact your bank as there is often some processing time before a refund is posted. If you've done all of this and still have not received your refund, please contact us at info@randragencies.online.",
          },
          {
            title: 'Sale Items',
            content: 'Only regular priced items may be refunded. Sale items cannot be refunded under any circumstances.',
          },
          {
            title: 'Exchanges',
            content: 'We only replace items if they are defective or damaged. If you need to exchange an item for the same product, send us an email at randr2405@gmail.com and we will guide you through the process.',
          },
        ].map((section, i) => (
          <div key={section.title} style={{
            marginBottom: '3rem',
            paddingBottom: '3rem',
            borderBottom: i < 4 ? '1px solid rgba(201,168,76,0.1)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '30px', height: '1px', background: '#C9A84C', flexShrink: 0 }} />
              <h2 style={{ fontSize: '1.5rem', color: '#F5F0E8' }}>{section.title}</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 2, letterSpacing: '0.03em' }}>
              {section.content}
            </p>
          </div>
        ))}

        {/* Need Help CTA */}
        <div style={{
          border: '1px solid rgba(201,168,76,0.2)',
          padding: '3rem',
          textAlign: 'center',
          background: '#0F0F0F',
        }}>
          <p className="section-label" style={{ marginBottom: '0.75rem' }}>Need Help?</p>
          <h3 style={{ fontSize: '1.5rem', color: '#F5F0E8', marginBottom: '1rem' }}>Still Have Questions?</h3>
          <div style={{ width: '40px', height: '1px', background: '#C9A84C', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.8, marginBottom: '2rem' }}>
            Contact us at{' '}
            <a href="mailto:info@randragencies.online" style={{ color: '#C9A84C', textDecoration: 'none' }}>
              info@randragencies.online
            </a>{' '}
            for any questions related to refunds and returns.
          </p>
          <Link href="/contact" className="btn-gold">Contact Us</Link>
        </div>

      </section>
    </div>
  );
}