$(document).ready(function(){
  // require aylien text analyzer API
  const AYLIENTextAPI = require('aylien_textapi');
  const textapi = new AYLIENTextAPI(aylienKey);
  const axios = require('axios');

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    // get url of active tab
    const tab = tabs[0];
    const url = tab.url;

    //get new source from url
    const startIndex = url.indexOf('.');
    const endIndex = url.indexOf('.com') > -1 ? url.indexOf('.com') : url.indexOf('.org');
    const newsSource = url.slice(startIndex + 1, endIndex);

    // show news source name, ideology, and trust
    $( "#news-source" ).append( `<p><h4>${newsSources[newsSource].name}</h4></p>` );
    $( "#news-source" ).append( `<p>Political Leaning: <em>${newsSources[newsSource].ideology}</em></p>` );
    $( "#news-source" ).append( `<p>Trustworthiness: <em>${newsSources[newsSource].trust}</em></p>` );

    // choose a random news source based current news source's ideology
    const oppositeIdeology = newsSources[newsSource].ideology === 'Liberal' ? 'Conservative' : 'Liberal';
    const oppositeNewsSources = [];
    _.forEach(newsSources, newsSource => {
      if (newsSource.ideology === oppositeIdeology) {
        oppositeNewsSources.push({
          name: newsSource.name ,
          domain: newsSource.domain
        });
      }
    });
    const suggestedNewsSource = oppositeNewsSources[Math.floor(Math.random() * oppositeNewsSources.length)];

    // render sentiment analysis and suggested link
    textapi.combined({
      "url": url,
      "endpoint": ["sentiment", "extract", "entities"]
    }, function(err, result) {
      if (err === null) {
        result.results.forEach(function(r) {
          if (r.endpoint === "entities") {
            // do google search with keywords and the other news source
            const keywordQuery = r.result.entities.keyword.filter(word => !word.includes(' ')).slice(0, 5).join('+');
            const googleQuery = `https://www.google.com/search?q=${keywordQuery}&sitesearch=${suggestedNewsSource.domain}`;
            let link;

            axios.get(googleQuery)
            .then(res => {
              const html = res.data;
              link = $(html).find('.g').find('a').attr('href');
            })
            .then(() => {
              return axios.get(link);
            })
            .then(res => {
                const html = res.data
                const title = $(html).filter('title').text();

                $("#alternate-source").append(`<a href="${link}" target="_blank">${title}</a><br><small> - ${suggestedNewsSource.name}</small>` );
                $("#loading").html('');
            })
            .catch(console.error);
          }

          if (r.endpoint === "extract") {
            // create word cloud with words in article
            const list = [];
            const wordsFrequency = {};
            const functionWords = ['the', 'a', 'an', 'is', 'are', 'am', 'was', 'were', 'in', 'on', 'at', 'of', 'to', 'it', 'and', 'but', 'for', 'will', 'be'];
            // make array of all words in article except function words
            let wordsArr = r.result.article.split(' ')
              .map(str => str.toLowerCase())
              .filter(str => {
                return !functionWords.includes(str);
              });
            // get frequency of each word
            wordsArr.forEach(word => {
              wordsFrequency[word] = (wordsFrequency[word] + 1) || 1;
            });
            // make array of only unique words
            wordsArr = Object.keys(wordsFrequency);

            wordsArr.forEach(word => {
              list.push([word, Math.floor(wordsFrequency[word] * 10)]);
            })
            WordCloud(document.getElementById('my_canvas'), {
              list: list,
              fontFamily: 'Roboto',
              color: (word, weight) => {
                const colorsArr = ['#67c8b7', '#705eaa', '#f0a689', '#e4551d', '#ffecb9']
                return colorsArr[Math.floor(Math.random() * colorsArr.length)];
              }
            });
          }

          if (r.endpoint === "sentiment") {
            $( "#sentiment" ).append(`<p>Article Polarity: <em>${r.result.polarity[0].toUpperCase() + r.result.polarity.slice(1)}</em></p>` );
            $( "#sentiment" ).append(`<p>Polarity Confidence: <em>${r.result.polarity_confidence.toFixed(4)}</em></p>` );
          }
        });
      } else {
        console.log(err)
      }
    });

  });
});
