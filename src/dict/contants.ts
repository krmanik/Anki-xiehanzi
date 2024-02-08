const FIELDS = {
    SIMPLIFIED: 'Simplified',
    TRADITIONAL: 'Traditional',
    PINYIN: 'Pinyin',
    ZHUYIN: 'Zhuyin',
    DEFINITIONS: 'Definitions',
    AUDIO: 'Audio',
};

const DECK_CSS =
    `.card {
    font-family: arial;
    font-size: 20px;
    text-align: center;
    color: black;
    background-color: white;
   }
  
  #frontSimplified {
     font-size: 48px;
  }
  
  #frontTraditional{
     font-size: 36px;
  }
  
  #backSimplified{
      display: inline;
     font-size: 28px;
  }
  
  #backTraditional{
      display: inline;
    font-size: 24px;
  }
  
  #backPinyin{}
  
  #backDefinitions {
      text-align: left;
      padding: 8px;
  }
  
  .definition-container{
    padding: 8px;
  }
  
  .def-simplified {
      display: inline;
  }
  
  .def-traditional {
      display: inline;
  }`;

export default {
    FIELDS,
    DECK_CSS
};
