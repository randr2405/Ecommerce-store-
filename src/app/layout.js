'use client';

import { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import './globals.css';

function GlobalStyles() {
  return (
    <style>{`
      .rr-pill-nav {
        position: fixed;
        top: 1.2rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.55rem 1.2rem 0.55rem 1.4rem;
        background: rgba(10,10,10,0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(201,168,76,0.25);
        border-radius: 999px;
        box-shadow: 0 4px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.08);
        white-space: nowrap;
      }

      .rr-pill-logo {
        font-family: 'Cormorant Garamond', serif;
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.18em;
        color: #C9A84C;
        text-decoration: none;
        text-transform: uppercase;
        transition: opacity 0.2s;
        flex-shrink: 0;
      }
      .rr-pill-logo span { color: #E8C96D; font-weight: 400; }
      .rr-pill-logo:hover { opacity: 0.8; }

      .rr-pill-track {
        display: flex;
        align-items: center;
        gap: 0.2rem;
      }

      .rr-pill {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.38rem 1rem;
        border-radius: 999px;
        text-decoration: none;
        overflow: hidden;
        transition: color 0.22s;
      }

      .rr-pill-bubble {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: rgba(201,168,76,0.12);
        opacity: 0;
        transform: scale(0.85);
        transition: opacity 0.22s, transform 0.22s;
        pointer-events: none;
      }
      .rr-pill:hover .rr-pill-bubble,
      .rr-pill--hovered .rr-pill-bubble {
        opacity: 1;
        transform: scale(1);
      }
      .rr-pill--active .rr-pill-bubble {
        opacity: 1;
        transform: scale(1);
        background: rgba(201,168,76,0.18);
      }

      .rr-pill-label {
        position: relative;
        z-index: 1;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.7rem;
        font-weight: 500;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: #aaa;
        transition: color 0.22s;
      }
      .rr-pill:hover .rr-pill-label,
      .rr-pill--hovered .rr-pill-label,
      .rr-pill--active .rr-pill-label { color: #C9A84C; }

      .rr-pill-icons {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-shrink: 0;
      }

      .rr-pill-icon-link {
        color: #888;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.3rem;
        border-radius: 50%;
        transition: color 0.2s, background 0.2s;
        text-decoration: none;
        position: relative;
      }
      .rr-pill-icon-link:hover {
        color: #C9A84C;
        background: rgba(201,168,76,0.1);
      }

      .rr-pill-icon-cart { position: relative; }
      .rr-cart-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #C9A84C;
        color: #0A0A0A;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.55rem;
        font-weight: 700;
        min-width: 16px;
        height: 16px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 3px;
        line-height: 1;
      }

      .rr-profile-wrapper {
        position: relative;
      }

      .rr-profile-btn {
        color: #888;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.3rem;
        border-radius: 50%;
        transition: color 0.2s, background 0.2s;
        background: none;
        border: none;
        cursor: pointer;
      }
      .rr-profile-btn:hover,
      .rr-profile-btn--active {
        color: #C9A84C;
        background: rgba(201,168,76,0.1);
      }

      .rr-profile-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: linear-gradient(135deg, #C9A84C, #E8C96D);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.6rem;
        font-weight: 700;
        color: #0A0A0A;
        letter-spacing: 0.05em;
      }

      .rr-profile-dropdown {
        position: absolute;
        top: calc(100% + 0.8rem);
        right: 0;
        min-width: 200px;
        background: rgba(10,10,10,0.97);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(201,168,76,0.2);
        border-radius: 12px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.06);
        overflow: hidden;
        transform-origin: top right;
        animation: rrDropIn 0.2s cubic-bezier(0.16,1,0.3,1);
      }

      @keyframes rrDropIn {
        from { opacity: 0; transform: scale(0.92) translateY(-6px); }
        to   { opacity: 1; transform: scale(1)    translateY(0); }
      }

      .rr-dropdown-header {
        padding: 1rem 1.2rem 0.8rem;
        border-bottom: 1px solid rgba(201,168,76,0.1);
      }
      .rr-dropdown-name {
        font-family: 'Cormorant Garamond', serif;
        font-size: 0.95rem;
        font-weight: 600;
        color: #E8C96D;
        letter-spacing: 0.05em;
      }
      .rr-dropdown-email {
        font-family: 'Montserrat', sans-serif;
        font-size: 0.6rem;
        color: #666;
        letter-spacing: 0.04em;
        margin-top: 0.15rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 160px;
      }

      .rr-dropdown-item {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.7rem 1.2rem;
        text-decoration: none;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.68rem;
        font-weight: 500;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #888;
        transition: color 0.2s, background 0.2s;
        cursor: pointer;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
      }
      .rr-dropdown-item:hover {
        color: #C9A84C;
        background: rgba(201,168,76,0.06);
      }
      .rr-dropdown-item--danger:hover {
        color: #e07070;
        background: rgba(220,80,80,0.06);
      }
      .rr-dropdown-divider {
        height: 1px;
        background: rgba(201,168,76,0.1);
        margin: 0.2rem 0;
      }

      .rr-hamburger {
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 4px;
        width: 32px;
        height: 32px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.3rem;
        border-radius: 6px;
        transition: background 0.2s;
      }
      .rr-hamburger:hover { background: rgba(201,168,76,0.1); }
      .rr-hamburger span {
        display: block;
        width: 18px;
        height: 1.5px;
        background: #888;
        border-radius: 2px;
        transition: transform 0.25s, opacity 0.25s, background 0.2s;
        transform-origin: center;
      }
      .rr-hamburger:hover span { background: #C9A84C; }
      .rr-hamburger--open span:nth-child(1) { transform: translateY(5.5px) rotate(45deg); }
      .rr-hamburger--open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
      .rr-hamburger--open span:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); }

      .rr-bubble-overlay {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 998;
        background: rgba(5,5,5,0.92);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.35s ease;
        pointer-events: none;
      }
      .rr-bubble-overlay--visible {
        opacity: 1;
        pointer-events: auto;
      }

      .rr-bubble-grid {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        width: 100%;
      }

      .rr-bubble-item {
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        border-radius: 999px;
        border: 1px solid rgba(201,168,76,0.2);
        background: rgba(201,168,76,0.04);
        padding: 1rem 3rem;
        width: min(320px, 80vw);
        position: relative;
        overflow: hidden;
        transform: scale(0.75) translateY(20px);
        opacity: 0;
        transition:
          transform 0.45s cubic-bezier(0.34,1.56,0.64,1),
          opacity 0.35s ease,
          background 0.25s,
          border-color 0.25s;
      }
      .rr-bubble-item--entered {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
      .rr-bubble-item::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(201,168,76,0.15), transparent 60%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .rr-bubble-item:hover::before,
      .rr-bubble-item--active::before { opacity: 1; }
      .rr-bubble-item:hover,
      .rr-bubble-item--active {
        border-color: rgba(201,168,76,0.55);
        background: rgba(201,168,76,0.1);
      }
      .rr-bubble-item-label {
        font-family: 'Cormorant Garamond', serif;
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #888;
        transition: color 0.25s;
        position: relative;
        z-index: 1;
      }
      .rr-bubble-item:hover .rr-bubble-item-label,
      .rr-bubble-item--active .rr-bubble-item-label { color: #E8C96D; }
      .rr-bubble-item-dot {
        position: absolute;
        right: 1.5rem;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #C9A84C;
        opacity: 0;
        transform: scale(0);
        transition: opacity 0.25s, transform 0.25s;
        z-index: 1;
      }
      .rr-bubble-item--active .rr-bubble-item-dot {
        opacity: 1;
        transform: scale(1);
      }

      .rr-bubble-close-hint {
        position: absolute;
        bottom: 2.5rem;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'Montserrat', sans-serif;
        font-size: 0.6rem;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        color: #444;
        opacity: 0;
        transition: opacity 0.5s ease 0.6s;
        pointer-events: none;
      }
      .rr-bubble-overlay--visible .rr-bubble-close-hint { opacity: 1; }

      .rr-bubble-wordmark {
        position: absolute;
        top: 2rem;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'Cormorant Garamond', serif;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.3em;
        color: rgba(201,168,76,0.3);
        text-transform: uppercase;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.5s ease 0.2s;
      }
      .rr-bubble-overlay--visible .rr-bubble-wordmark { opacity: 1; }

      @media (max-width: 768px) {
        .rr-pill-track { display: none; }
        .rr-hamburger { display: flex; }
        .rr-bubble-overlay { display: flex; }
        .rr-pill-nav {
          top: 0.8rem;
          padding: 0.5rem 1rem;
          width: calc(100% - 2rem);
          max-width: 480px;
        }
      }
      @media (max-width: 480px) {
        .rr-pill-logo { font-size: 0.85rem; }
      }

      .wa-bubble-btn {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 990;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #25D366;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 24px rgba(37,211,102,0.35), 0 2px 8px rgba(0,0,0,0.4);
        transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s;
        animation: waPulse 2.8s ease-in-out infinite;
      }
      .wa-bubble-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 32px rgba(37,211,102,0.5), 0 2px 8px rgba(0,0,0,0.4);
        animation: none;
      }
      .wa-bubble-btn--open {
        transform: scale(0.92);
        animation: none;
      }

      @keyframes waPulse {
        0%, 100% { box-shadow: 0 4px 24px rgba(37,211,102,0.35), 0 2px 8px rgba(0,0,0,0.4); }
        50% { box-shadow: 0 4px 32px rgba(37,211,102,0.6), 0 0 0 10px rgba(37,211,102,0.08), 0 2px 8px rgba(0,0,0,0.4); }
      }

      .wa-card {
        position: fixed;
        bottom: 6.5rem;
        right: 2rem;
        z-index: 989;
        width: 300px;
        background: #111;
        border: 1px solid rgba(201,168,76,0.2);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.06);
        transform-origin: bottom right;
        transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      .wa-card--hidden {
        opacity: 0;
        transform: scale(0.88) translateY(12px);
        pointer-events: none;
      }
      .wa-card--visible {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: auto;
      }

      .wa-card-header {
        background: #1A2E1A;
        padding: 1rem 1.2rem;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        border-bottom: 1px solid rgba(37,211,102,0.15);
      }

      .wa-avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1a1a0a, #2a2010);
        border: 2px solid rgba(201,168,76,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Cormorant Garamond', serif;
        font-size: 0.75rem;
        font-weight: 600;
        color: #C9A84C;
        letter-spacing: 0.05em;
        flex-shrink: 0;
      }

      .wa-header-info { flex: 1; min-width: 0; }

      .wa-header-name {
        font-family: 'Montserrat', sans-serif;
        font-size: 0.75rem;
        font-weight: 600;
        color: #F5F0E8;
        letter-spacing: 0.08em;
      }

      .wa-header-status {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin-top: 0.2rem;
      }

      .wa-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #25D366;
        animation: waDotPulse 2s ease-in-out infinite;
      }

      @keyframes waDotPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      .wa-status-text {
        font-family: 'Montserrat', sans-serif;
        font-size: 0.58rem;
        color: #25D366;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .wa-card-body {
        padding: 1.2rem;
      }

      .wa-message-bubble {
        background: #1E2E1E;
        border: 1px solid rgba(37,211,102,0.12);
        border-radius: 12px 12px 12px 3px;
        padding: 0.85rem 1rem;
        margin-bottom: 1.2rem;
        position: relative;
      }

      .wa-message-text {
        font-family: 'Montserrat', sans-serif;
        font-size: 0.72rem;
        color: #ccc;
        line-height: 1.7;
        letter-spacing: 0.02em;
      }

      .wa-message-time {
        font-family: 'Montserrat', sans-serif;
        font-size: 0.55rem;
        color: #555;
        text-align: right;
        margin-top: 0.4rem;
        letter-spacing: 0.05em;
      }

      .wa-input-row {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        background: #1A1A1A;
        border: 1px solid rgba(201,168,76,0.15);
        border-radius: 999px;
        padding: 0.4rem 0.4rem 0.4rem 0.9rem;
        margin-bottom: 0.8rem;
      }

      .wa-input {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.72rem;
        color: #F5F0E8;
        letter-spacing: 0.02em;
        min-width: 0;
      }
      .wa-input::placeholder { color: #444; }

      .wa-send-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #25D366;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background 0.2s, transform 0.2s;
      }
      .wa-send-btn:hover {
        background: #20c25c;
        transform: scale(1.08);
      }

      .wa-cta {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.7rem;
        background: #25D366;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Montserrat', sans-serif;
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: #fff;
        text-decoration: none;
        transition: opacity 0.2s, transform 0.15s;
      }
      .wa-cta:hover {
        opacity: 0.88;
        transform: translateY(-1px);
      }

      .wa-card-footer {
        padding: 0.6rem 1.2rem 0.8rem;
        text-align: center;
        border-top: 1px solid rgba(255,255,255,0.04);
      }

      .wa-footer-text {
        font-family: 'Montserrat', sans-serif;
        font-size: 0.55rem;
        color: #444;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      @media (max-width: 480px) {
        .wa-bubble-btn { bottom: 1.2rem; right: 1.2rem; }
        .wa-card { right: 1.2rem; bottom: 5.5rem; width: calc(100vw - 2.4rem); max-width: 300px; }
      }
    `}</style>
  );
}

function WhatsAppBubble() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const cardRef = useRef(null);
  const btnRef = useRef(null);

  const defaultMessage = "Hi R&R Agencies, I'd like to find out more about your products.";
  const phoneNumber = '27813365266';

  const buildLink = () => {
    const text = encodeURIComponent(message.trim() || defaultMessage);
    return `https://wa.me/${phoneNumber}?text=${text}`;
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        open &&
        cardRef.current &&
        !cardRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div ref={cardRef} className={`wa-card ${open ? 'wa-card--visible' : 'wa-card--hidden'}`}>
        <div className="wa-card-header">
          <div className="wa-avatar">R&R</div>
          <div className="wa-header-info">
            <div className="wa-header-name">R&R AGENCIES</div>
            <div className="wa-header-status">
              <div className="wa-status-dot" />
              <span className="wa-status-text">Typically replies fast</span>
            </div>
          </div>
        </div>

        <div className="wa-card-body">
          <div className="wa-message-bubble">
            <p className="wa-message-text">
              👋 Hey there! Welcome to R&R Agencies. How can we help you today? Feel free to ask about our products, sizing, or orders.
            </p>
            <div className="wa-message-time">{timeStr} ✓✓</div>
          </div>

          <div className="wa-input-row">
            <input
              className="wa-input"
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  window.open(buildLink(), '_blank', 'noopener,noreferrer');
                }
              }}
            />
            <a
              href={buildLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-send-btn"
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </a>
          </div>

          <a
            href={buildLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-cta"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Open in WhatsApp
          </a>
        </div>

        <div className="wa-card-footer">
          <span className="wa-footer-text">Powered by WhatsApp Business</span>
        </div>
      </div>

      <button
        ref={btnRef}
        className={`wa-bubble-btn${open ? ' wa-bubble-btn--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Chat on WhatsApp"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        )}
      </button>
    </>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <style dangerouslySetInnerHTML={{ __html: `
          .pac-container { background-color: #1A1A1A !important; border: 1px solid rgba(201,168,76,0.25) !important; font-family: Montserrat, sans-serif !important; z-index: 999999 !important; }
          .pac-item { color: #aaa !important; background-color: #1A1A1A !important; padding: 0.65rem 1rem !important; font-size: 0.72rem !important; display: block !important; }
          .pac-item:hover, .pac-item-selected { background-color: rgba(201,168,76,0.1) !important; }
          .pac-item-query { color: #F5F0E8 !important; }
          .pac-matched { color: #C9A84C !important; font-weight: 600 !important; }
          .pac-icon, .pac-icon-marker, .hdpi .pac-icon { display: none !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; background-image: none !important; }
          .pac-logo:after { display: none !important; }
        ` }} />
        <AuthProvider>
          <GlobalStyles />
          <PillNav />
          <main>{children}</main>
          <Footer />
          <WhatsAppBubble />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#E8C96D',
                border: '1px solid #C9A84C',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '0.8rem',
                letterSpacing: '0.05em',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

const NAV_ITEMS = [
  { label: 'Home',    href: '/' },
  { label: 'Shop',    href: '/shop' },
  { label: 'About',   href: '/about' },
  { label: 'Contact', href: '/contact' },
];

function ProfileButton({ onOpenModal }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <div className="rr-profile-wrapper" ref={wrapperRef}>
      <button
        className={`rr-profile-btn${open ? ' rr-profile-btn--active' : ''}`}
        onClick={() => user ? setOpen(v => !v) : onOpenModal()}
        aria-label="Profile"
        title="Profile"
      >
        {user && initials ? (
          <div className="rr-profile-avatar">{initials}</div>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        )}
      </button>

      {open && user && (
        <div className="rr-profile-dropdown">
          <div className="rr-dropdown-header">
            <div className="rr-dropdown-name">{user.displayName || 'Welcome'}</div>
            <div className="rr-dropdown-email">{user.email}</div>
          </div>

          <a href="/account" className="rr-dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            My Account
          </a>

          <a href="/account?tab=orders" className="rr-dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>
            </svg>
            My Orders
          </a>

          <a href="/account?tab=addresses" className="rr-dropdown-item" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Addresses
          </a>

          <div className="rr-dropdown-divider" />

          <button className="rr-dropdown-item rr-dropdown-item--danger" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function PillNav() {
  const [cartCount, setCartCount] = useState(0);
  const [activeHref, setActiveHref] = useState('/');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [enteredItems, setEnteredItems] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const overlayRef = useRef(null);
  const timerRefs = useRef([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActiveHref(window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const updateCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const total = cart.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(total);
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener('cartUpdated', updateCount);
    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('cartUpdated', updateCount);
    };
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      timerRefs.current.forEach(t => clearTimeout(t));
      setEnteredItems([]);
      NAV_ITEMS.forEach((_, i) => {
        const t = setTimeout(() => {
          setEnteredItems(prev => [...prev, i]);
        }, 80 + i * 80);
        timerRefs.current[i] = t;
      });
    } else {
      document.body.style.overflow = '';
      timerRefs.current.forEach(t => clearTimeout(t));
      setEnteredItems([]);
    }
    return () => {
      document.body.style.overflow = '';
      timerRefs.current.forEach(t => clearTimeout(t));
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <nav className="rr-pill-nav">
        <a href="/" className="rr-pill-logo">
          R&amp;R <span>AGENCIES</span>
        </a>

        <div className="rr-pill-track">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className={`rr-pill${activeHref === item.href ? ' rr-pill--active' : ''}${hoveredIndex === i ? ' rr-pill--hovered' : ''}`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span className="rr-pill-bubble" aria-hidden="true" />
              <span className="rr-pill-label">{item.label}</span>
            </a>
          ))}
        </div>

        <div className="rr-pill-icons">
          <ProfileButton onOpenModal={() => setAuthModalOpen(true)} />

          <a href="/cart" title="Cart" className="rr-pill-icon-link rr-pill-icon-cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="rr-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </a>

          <button
            className={`rr-hamburger${mobileOpen ? ' rr-hamburger--open' : ''}`}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div
        ref={overlayRef}
        className={`rr-bubble-overlay${mobileOpen ? ' rr-bubble-overlay--visible' : ''}`}
        onClick={(e) => { if (e.target === overlayRef.current) setMobileOpen(false); }}
        aria-hidden={!mobileOpen}
      >
        <span className="rr-bubble-wordmark">R&amp;R AGENCIES</span>
        <div className="rr-bubble-grid">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className={`rr-bubble-item${enteredItems.includes(i) ? ' rr-bubble-item--entered' : ''}${activeHref === item.href ? ' rr-bubble-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="rr-bubble-item-label">{item.label}</span>
              <span className="rr-bubble-item-dot" aria-hidden="true" />
            </a>
          ))}
        </div>
        <span className="rr-bubble-close-hint">tap outside to close</span>
      </div>

      {authModalOpen && (
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      )}
    </>
  );
}

function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, resetPassword } = useAuth();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(''); setSuccess('');
    setForm({ name: '', email: '', password: '', confirm: '' });
    setMode('login');
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isOpen) return null;

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Please fill in all fields.');
    setLoading(true);
    try {
      await login(form.email, form.password);
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm)
      return setError('Please fill in all fields.');
    if (form.password !== form.confirm)
      return setError('Passwords do not match.');
    if (form.password.length < 8)
      return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!form.email) return setError('Enter your email address.');
    setLoading(true);
    try {
      await resetPassword(form.email);
      setSuccess('Reset link sent — check your inbox.');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        .rr-modal-overlay {
          position: fixed; inset: 0; z-index: 2000;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: rrFadeIn 0.2s ease;
        }
        @keyframes rrFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .rr-modal-box {
          width: 100%; max-width: 400px;
          background: #0D0D0D;
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7);
          animation: rrSlideUp 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes rrSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }

        .rr-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.4rem 1.6rem 0;
        }
        .rr-modal-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem; font-weight: 600;
          letter-spacing: 0.2em; color: #C9A84C;
          text-transform: uppercase;
        }
        .rr-modal-close {
          background: none; border: none; cursor: pointer;
          color: #555; padding: 0.3rem; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.2s, background 0.2s;
        }
        .rr-modal-close:hover { color: #C9A84C; background: rgba(201,168,76,0.1); }

        .rr-modal-tabs {
          display: flex; gap: 0; margin: 1.2rem 1.6rem 0;
          border-bottom: 1px solid rgba(201,168,76,0.1);
        }
        .rr-modal-tab {
          flex: 1; background: none; border: none; cursor: pointer;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #555; padding: 0.7rem 0.5rem;
          border-bottom: 1px solid transparent;
          transition: color 0.2s, border-color 0.2s;
          margin-bottom: -1px;
        }
        .rr-modal-tab:hover { color: #999; }
        .rr-modal-tab--active { color: #C9A84C; border-bottom-color: #C9A84C; }

        .rr-modal-body { padding: 1.6rem; }

        .rr-modal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.75rem; font-weight: 400;
          letter-spacing: 0.25em; text-transform: uppercase;
          color: #555; margin-bottom: 1.4rem;
        }

        .rr-modal-field { margin-bottom: 1rem; }
        .rr-modal-label {
          display: block;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.6rem; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #666; margin-bottom: 0.4rem;
        }
        .rr-modal-input {
          width: 100%; padding: 0.7rem 0.9rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.78rem; color: #ddd;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .rr-modal-input::placeholder { color: #444; }
        .rr-modal-input:focus {
          border-color: rgba(201,168,76,0.45);
          background: rgba(201,168,76,0.03);
        }

        .rr-modal-error {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; color: #e07070;
          letter-spacing: 0.05em; margin-bottom: 1rem;
          padding: 0.6rem 0.8rem;
          background: rgba(220,80,80,0.08);
          border: 1px solid rgba(220,80,80,0.2);
          border-radius: 6px;
        }
        .rr-modal-success {
          font-family: 'Montserrat', sans-serif;
          font-size: 0.65rem; color: #7ec87e;
          letter-spacing: 0.05em; margin-bottom: 1rem;
          padding: 0.6rem 0.8rem;
          background: rgba(80,180,80,0.08);
          border: 1px solid rgba(80,180,80,0.2);
          border-radius: 6px;
        }

        .rr-modal-submit {
          width: 100%; padding: 0.85rem;
          background: linear-gradient(135deg, #C9A84C, #E8C96D);
          border: none; border-radius: 8px; cursor: pointer;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #0A0A0A;
          transition: opacity 0.2s, transform 0.2s;
          margin-top: 0.4rem;
        }
        .rr-modal-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .rr-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .rr-modal-link {
          background: none; border: none; cursor: pointer;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.62rem; color: #C9A84C;
          letter-spacing: 0.08em; text-decoration: underline;
          padding: 0; transition: opacity 0.2s;
        }
        .rr-modal-link:hover { opacity: 0.7; }

        .rr-modal-footer {
          text-align: center; margin-top: 1.2rem;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.62rem; color: #555;
          letter-spacing: 0.05em;
        }
      `}</style>

      <div
        ref={overlayRef}
        className="rr-modal-overlay"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <div className="rr-modal-box">
          <div className="rr-modal-header">
            <div className="rr-modal-logo">R&amp;R</div>
            <button className="rr-modal-close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {mode !== 'forgot' && (
            <div className="rr-modal-tabs">
              <button
                className={`rr-modal-tab${mode === 'login' ? ' rr-modal-tab--active' : ''}`}
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              >
                Sign In
              </button>
              <button
                className={`rr-modal-tab${mode === 'register' ? ' rr-modal-tab--active' : ''}`}
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              >
                Register
              </button>
            </div>
          )}

          <div className="rr-modal-body">
            {mode === 'login' && (
              <>
                <p className="rr-modal-title">Welcome back</p>
                {error && <div className="rr-modal-error">{error}</div>}
                <form onSubmit={handleLogin}>
                  <div className="rr-modal-field">
                    <label className="rr-modal-label">Email</label>
                    <input className="rr-modal-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                  </div>
                  <div className="rr-modal-field">
                    <label className="rr-modal-label">Password</label>
                    <input className="rr-modal-input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} autoComplete="current-password" />
                  </div>
                  <div style={{ textAlign: 'right', marginBottom: '1rem', marginTop: '-0.4rem' }}>
                    <button type="button" className="rr-modal-link" onClick={() => { setMode('forgot'); setError(''); }}>
                      Forgot password?
                    </button>
                  </div>
                  <button type="submit" className="rr-modal-submit" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </>
            )}

            {mode === 'register' && (
              <>
                <p className="rr-modal-title">Create your account</p>
                {error && <div className="rr-modal-error">{error}</div>}
                <form onSubmit={handleRegister}>
                  <div className="rr-modal-field">
                    <label className="rr-modal-label">Full Name</label>
                    <input className="rr-modal-input" type="text" placeholder="Your name" value={form.name} onChange={set('name')} autoComplete="name" />
                  </div>
                  <div className="rr-modal-field">
                    <label className="rr-modal-label">Email</label>
                    <input className="rr-modal-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                  </div>
                  <div className="rr-modal-field">
                    <label className="rr-modal-label">Password</label>
                    <input className="rr-modal-input" type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} autoComplete="new-password" />
                  </div>
                  <div className="rr-modal-field">
                    <label className="rr-modal-label">Confirm Password</label>
                    <input className="rr-modal-input" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
                  </div>
                  <button type="submit" className="rr-modal-submit" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <p className="rr-modal-title">Reset your password</p>
                {error && <div className="rr-modal-error">{error}</div>}
                {success && <div className="rr-modal-success">{success}</div>}
                {!success && (
                  <form onSubmit={handleForgot}>
                    <div className="rr-modal-field">
                      <label className="rr-modal-label">Email</label>
                      <input className="rr-modal-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
                    </div>
                    <button type="submit" className="rr-modal-submit" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                )}
                <div className="rr-modal-footer" style={{ marginTop: '1rem' }}>
                  <button type="button" className="rr-modal-link" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                    Back to sign in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function Footer() {
  return (
    <footer style={{
      background: '#0A0A0A',
      borderTop: '1px solid rgba(201,168,76,0.2)',
      padding: '4rem 2rem 2rem',
      marginTop: '5rem',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', color: '#C9A84C', letterSpacing: '0.2em', marginBottom: '1rem' }}>
              R&amp;R AGENCIES
            </div>
            <p style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.8, letterSpacing: '0.03em' }}>
              Premium sport &amp; lifestyle clothing. Based in Verulam, South Africa.
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1.2rem' }}>Navigate</p>
            {[
              { label: 'Home',           href: '/' },
              { label: 'Shop',           href: '/shop' },
              { label: 'About Us',       href: '/about' },
              { label: 'Contact Us',     href: '/contact' },
              { label: 'Returns Policy', href: '/returns' },
            ].map(link => (
              <div key={link.href} style={{ marginBottom: '0.6rem' }}>
                <a
                  href={link.href}
                  style={{ fontSize: '0.75rem', color: '#888', textDecoration: 'none', letterSpacing: '0.05em' }}
                  onMouseEnter={e => e.target.style.color = '#C9A84C'}
                  onMouseLeave={e => e.target.style.color = '#888'}
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '1.2rem' }}>Contact</p>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.6rem' }}>SBDC Building, 2 Columbus Rd,<br />Verulam, Unit 13</p>
            <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.6rem' }}>info@randragencies.online</p>
            <p style={{ fontSize: '0.75rem', color: '#888' }}>081 336 5266</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.1em' }}>
            © {new Date().getFullYear()} R&amp;R AGENCIES. ALL RIGHTS RESERVED. · randragencies.online
          </p>
        </div>
      </div>
    </footer>
  );
}