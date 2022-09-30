import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';
import { HomepageGetStarted, HomepageXiehanziCard } from '../components/HomepageCards';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
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
