import Link from "@docusaurus/Link";
import React from "react";
import { MdDownload, MdCreate, MdBook } from "react-icons/md";
import styles from './styles.module.css';

export function HomepageXiehanziCard(): JSX.Element {
  return (
    <div>
      <div className={styles.wrapper}>
        <div className={styles.homePageTools}>Want to generate your own Anki xiehanzi decks?</div>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg margin--sm"
            to="/Anki-xiehanzi/create">
            Create Now
          </Link>
        </div>
      </div>
    </div>
  )
}

export function HomepageGetStarted(): JSX.Element {
  return (
    <div>
      <div className={styles.diveInText}>Ready to dive in?</div>
      <div className="container">
        <div className="row" style={{ justifyContent: "center" }}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </div>
  )
}

type FeatureItem = {
  title: string;
  icon: JSX.Element;
  link: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Import',
    icon: <MdDownload />,
    link: "/docs/gettings-started/download",
    description: (
      <>
        Import HSK 3.0 decks in Anki with simplified, traditional, pinyin, zhuyin, audio and meanings.
      </>
    ),
  },
  {
    title: 'Create',
    icon: <MdCreate />,
    link: "/create",
    description: (
      <>
        Create your own xiehanzi decks for Anki with simplified, traditional, pinyin, zhuyin, audio and meanings.
      </>
    ),
  },
  {
    title: 'Guide',
    icon: <MdBook />,
    link: "/docs/intro",
    description: (
      <>
        Follow documentations on how to customize and update the Anki xiehanzi decks.
      </>
    ),
  },
];

function Feature({ title, icon, link, description }: FeatureItem) {
  return (
    <div className="card col col--3 margin-bottom--lg margin-left--sm margin-right--sm" style={{
      border: "1px solid #e1e1e1"
    }}>
      <Link style={{color:"unset", textDecoration:"none"}}
      to={link}>
        <div className="text--center margin-top--md">
          <div className={styles.featureIcon}>{icon}</div>
        </div>
        <div className="text--center">
          <div className="card__header">
            <h3>{title}</h3>
          </div>
          <div className="card__body text--left">
            <p>{description}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
