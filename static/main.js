define(['d3.layout.cloud', 'd3'], function(d3cloud, d3)
{

  let dim = 700; //if changed, must also be changed in styles.css; TODO: connect these two

  //make file read here maybe or add default to html box

  let text = "should would could also i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs themselves what which who whom this that these those am is are was were be been being have has had having do does did doing a an the and but if or because as until while of at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just should now"
  let stopWords = text.split(" ");

  let fileUploadLast = false; //keeps track of whether a file has been uploaded or the textarea input changed more recently, to know which one to use when generating

  document.getElementById("stopWordsBoxPref").value = stopWords.toString().replaceAll(",", " ");

  document.getElementById('generateButton').onclick = () => 
  {
    let userPrefs = {
      padding: document.getElementById('paddingPref').value,
      numWords: document.getElementById('numWordsPref').value,
      minCount: document.getElementById('minCountPref').value,
      fontSize: document.getElementById('fontSizePref').value,
      stopWord: document.getElementById('stopWordsPref').checked,
      numbers: document.getElementById('numbersPref').checked,
      lightness: document.getElementById('lightnessPref').checked,
      semantic: document.getElementById('semanticPref').checked,
      color: Array.from(document.querySelectorAll('div#colorPref input')).map(d => d.value), //convert to array (because it's actually a nodelist) and create array of hex color values
      rectBounding: document.getElementById('rectBoundingPref').checked,
      circleBounding: document.getElementById('circleBoundingPref').checked
    }

    let fileInput = document.getElementById("fileInput");
    let textInput = document.getElementById("rawTextInput");

    document.getElementById("wordCloudPreview").childNodes.forEach(function(d) //clear wordCloudPreview box
    {
      document.getElementById("wordCloudPreview").removeChild(d);
    });

    let allWords;
    if(fileUploadLast && fileInput.files.length>0)
    {
      console.log(fileInput);

      let file = fileInput.files[0];
      let reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function()
      {
        allWords = parseText(reader.result);
        addCloudToHTML(allWords, userPrefs);
      };
    }
    else if(!fileUploadLast && textInput.value.length>0)
    {
      allWords = parseText(textInput.value);
      addCloudToHTML(allWords, userPrefs);
    }
  }

  document.getElementById("fileInput").onchange = () => fileUploadLast = true;

  document.getElementById("rawTextInput").onchange = (e) => e.target.value.length>0 ? fileUploadLast = false : fileUploadLast = true;

  document.getElementById("stopWordsPref").onchange = function()
  {
    let source = document.getElementById("stopWordsPref");
    if(source.checked)
    {
      document.getElementById("stopWordsBoxPrefDiv").style.display = "block";
      document.getElementById("stopWordsBoxPref").value = stopWords.toString().replaceAll(",", " ");
    }
    else
    {
      document.getElementById("stopWordsBoxPrefDiv").style.display = "none;";
    }
  };

  document.getElementById("stopWordsBoxPref").onchange = function()
  {
    stopWords = document.getElementById("stopWordsBoxPref").value.split(" ");
  };

  function parseText(textStr) {
    let words = textStr.split('\n').join(' ').split('\r').join(' ').split(' ');
    let cleanWords = words.map(word => word.replace(/[;:()“”."!?,—]/g, "")) //dashes should convert to space not empty str
    cleanWords = cleanWords.map(word => word.replace(/[-_–]/g, " "))
    let wordsDict = {}
    cleanWords.forEach(function(c) {
      if(c.length > 0)
      {
        if(c in wordsDict) {
          wordsDict[c]++
        }
        else {
          wordsDict[c] = 1
        }
      }
    })
    let textArr = Object.keys(wordsDict)
    let freqArr = Object.values(wordsDict)
    let wordsFreq = []
    for(let i = 0; i < Object.keys(wordsDict).length; i++){
      let thisWord = {text: textArr[i], frequency: freqArr[i], semGroup: 1} //call function here that determines semantic group
      wordsFreq.push(thisWord)
    }
    /*wordsFreq = wordsFreq.sort(function(e, f)
    {
      if(e.frequency <= f.frequency)
      {
        ? 1 : -1);
    });*/
    console.log(wordsFreq);
    wordsFreq = wordsFreq.filter(x => stopWords.findIndex(el => {return el.toUpperCase() === x.text.toUpperCase()}) === -1);
    console.log(wordsFreq)

    wordsFreq.forEach(function(wordObj) {
      findMatch = wordsFreq.map(y => y.text).indexOf(wordObj.text.toLowerCase())
      if (findMatch !== -1 && wordsFreq[findMatch] !== wordObj) {
        if(wordObj.frequency > wordsFreq[findMatch].frequency) {
          wordObj.frequency += wordsFreq[findMatch].frequency
          wordsFreq.splice(findMatch, 1)
        }
        else if (wordObj.frequency <= wordsFreq[findMatch].frequency) {
          wordsFreq[findMatch].frequency += wordObj.frequency
          wordsFreq.splice(wordsFreq.indexOf(wordObj), 1)
        }
      } 
    })
    return wordsFreq.sort((e, f) => (e.frequency <= f.frequency) ? 1 : -1); //sort in descending order
  }

  function addCloudToHTML(allWords, userPrefs) //is there a better name for this? It's just sort of random things I had to separate because of the file loading event
  {
    let newWords = allWords.slice(0, Math.min(allWords.length, userPrefs.numWords)); //if there are more words in text than user specified, remove the extra
    console.log(newWords);
    while(newWords.length>0 && (newWords[newWords.length-1].frequency<=userPrefs.minCount || (newWords.length<allWords.length && newWords[newWords.length-1].frequency === allWords[newWords.length].frequency)))
    { //remove words one at a time until there are no cases of a word being in the list while another word with the same frequency is not in the list, and also remove words with frequency less than minFrequency pref
      newWords.pop();
    }

    let cloud = createCloud(newWords, userPrefs);
    document.getElementById("wordCloudPreview").append(cloud);

    let extraWords1 = Array.from(document.querySelectorAll('#cloud text')).filter(d => (d['__data__'].x>dim/2 || d['__data__'].x<0-dim/2 || d['__data__'].y>dim/2 || d['__data__'].y<0-dim/2)).map(d => d['__data__']);
    //^words that were too big to include (didn't fit); note: this is only words that were placed but are too big to be shown, not words that hypothetically wouldn't fit

    document.getElementById("extraWords").style.display = "block";
    document.getElementById("extraWordsList").innerHTML = "";
    let extraWords = extraWords1.concat(allWords.filter(d => !newWords.includes(d))); //words that were too big or too small to include
    let i = 0;
    while(i<extraWords.length && i<100)
    {
      document.getElementById("extraWordsList").innerHTML+="<li>"+extraWords[i].text+", appears "+extraWords[i].frequency+" times</li>";
      i++;
    }
    
  }

  function createCloud(words, userPrefs)
  {
    let svg = d3.create("svg")
      .attr("width", dim)
      .attr("height", dim);

    let sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(words, d => d.frequency)])
        .range([0, userPrefs.fontSize])

    let color = d3.interpolateLab(d3.interpolateLab('#ffffff', userPrefs.color)(.25), d3.interpolateLab(userPrefs.color, '#000000')(.25));

    let cloud = d3cloud()
      .words(words)
      .size([dim, dim])
      .font("sans-serif")
      .rotate(0)
      .fontSize(d => d.fontSize)
      .padding(userPrefs.padding)
      .on("end", function() //when cloud generation is finished, create text in svg element
      {
        svg.selectAll("text")
          .data(words)
          .join("text")
          .attr("font-size", d => d.fontSize)
          .attr("font-family", d => d.font)
          .attr("text-anchor", "middle") //important
          .attr("fill", d => color(d.frequency/d3.max(words, d => d.frequency)))
          .attr("x", d => d.x+dim/2) //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
          .attr("y", d => d.y+dim/2)
          .attr("cursor", "pointer")
          .text(d => d.text)
          //.semGroup(d => d.semGroup);
          //.title(d => d.frequency)
          .on('mouseover', function(event, d) 
          {
            d3.select('#wordFreqTooltip').text("appears "+d.frequency+" times");
            d3.select('#wordFreqTooltip').attr('x', d.x+dim/2+5);
            d3.select('#wordFreqTooltip').attr('y', d.y+dim/2+15);
            d3.select('#wordFreqTooltip').attr('display', 'block');
            this.style['font-weight'] = 'bold';
            d3.select("#wordFreqTooltipBackground").attr('x', d.x+dim/2);
            d3.select("#wordFreqTooltipBackground").attr('y', d.y+dim/2);
            d3.select("#wordFreqTooltipBackground").attr('display', 'block');
          })
          .on('mouseout', function(event, d) 
          {
            d3.select('#wordFreqTooltip').text("");
            d3.select('#wordFreqTooltip').attr('display', 'none');
            this.style['font-weight'] = 'normal';
            d3.select("#wordFreqTooltipBackground").attr('display', 'none');
          })
      });

    words.forEach(function(d){
      d.fontSize = sizeScale(d.frequency);
    });

    cloud.start();
    console.log(svg.node());

    svg.append('rect')
      .attr('id', 'wordFreqTooltipBackground')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 150)
      .attr('height', 20)
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('display', 'none');

    svg.append('text')
      .attr('id', 'wordFreqTooltip')
      .attr('font-size', '16')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 150)
      .attr('height', 10)
      .attr('display', 'none');

    return svg.node();
  }
})

