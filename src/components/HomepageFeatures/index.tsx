import React from 'react';
import styles from './styles.module.css';
import { MdStyle, MdTranslate, MdAudiotrack } from 'react-icons/md';
import { BsFillBrushFill, BsSpellcheck } from 'react-icons/bs';

type FeatureItem = {
  title: string;
  icon: JSX.Element;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'HSK 3.0',
    icon: <MdStyle />,
    description: (
      <>
        Learn, read and write HSK 3.0 (HSK 1-9) characters in Anki.
      </>
    ),
  },
  {
    title: 'Meanings',
    icon: <MdTranslate />,
    description: (
      <>
        Learn definitions of characters with audio and detailed meaning.
      </>
    ),
  },
  {
    title: 'Pinyin',
    icon: <BsSpellcheck />,
    description: (
      <>
        Learn pronunciations of character with Pinyin and Zhuyin.
      </>
    ),
  },
  {
    title: 'Strokes',
    icon: <BsFillBrushFill />,
    description: (
      <>
        Practice strokes order of simplified and traditional characters by drawing strokes.
      </>
    ),
  },
  {
    title: 'Audio',
    icon: <MdAudiotrack />,
    description: (
      <>
        Learn definitions of characters with audio and detailed meaning.
      </>
    ),
  },
  {
    title: 'Zhuyin',
    icon: <BsSpellcheck />,
    description: (
      <>
        Learn pronunciations of character with Pinyin and Zhuyin.
      </>
    ),
  },
];

function Feature({ title, icon, description }: FeatureItem) {
  return (
    <div className="padding--sm col col--4">
      <div className="text--center">
        <div className={styles.featureIcon}>{icon}</div>
      </div>
      <div className="text--center">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className='hero__title padding-bottom--lg'>Features</div>
        <div className="row" style={{ justifyContent: "space-evenly" }}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
