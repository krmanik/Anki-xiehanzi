import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';
import { HomepageGetStarted, HomepageXiehanziCard } from '../components/HomepageCards';

import HanziWriter from 'hanzi-writer';

function HomepageHeader() {
  const ref = useRef()

  useEffect(() => {
    createXieHanziLogo(ref);
  }, []);

  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div ref={ref}></div>
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div style={{
          display: "inline-flex",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          <div className={styles.buttons}>
            <Link
              className="button button--info button--outline button--lg margin--sm"
              to="/docs/intro">
              Getting Started
            </Link>
          </div>
          <div className={styles.buttons}>
            <Link
              className="button button--info button--outline button--lg margin--sm"
              to="/create">
              Create Deck
            </Link>
          </div>
          <div className={styles.buttons}>
            <Link
              className="button button--success button--outline button--lg margin--sm"
              to="/docs/gettings-started/download">
              Download Decks
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function DevAlert() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '28px 32px',
        maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        fontFamily: 'inherit', textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#111' }}>New site in development</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#555', lineHeight: 1.6 }}>
          We're rebuilding Anki Xièhànzì with better performance and new features.
          Try it out and let us know what you think!
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a
            href="/Anki-xiehanzi/"
            style={{
              background: '#4f46e5', color: '#fff', borderRadius: 8,
              padding: '9px 20px', fontWeight: 600, fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Visit dev site
          </a>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: '#f3f4f6', color: '#374151', border: 'none',
              borderRadius: 8, padding: '9px 20px', fontWeight: 600,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <DevAlert />
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
      <section>
        <HomepageXiehanziCard />
      </section>
      <section>
        <HomepageGetStarted />
      </section>
    </Layout>
  );
}

function createXieHanziLogo(ref) {
  let xiehanzi = ["写", "汉", "字"];

  for (let hanzi of xiehanzi) {
    const writer = HanziWriter.create(ref.current, hanzi, {
      width: 80,
      height: 80,
      padding: 5,
      strokeColor: hanzi == "写" ? "#4caf50" : "#2196f3"
    })
    writer.loopCharacterAnimation();
  }
}