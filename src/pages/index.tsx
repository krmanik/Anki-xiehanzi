import React, { useEffect, useRef } from 'react';
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
          flexWrap: "wrap"
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

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
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