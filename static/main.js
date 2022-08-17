define(['d3.layout.cloud', 'd3'], function(d3cloud, d3)
{

  let dim = 700; //if changed, must also be changed in styles.css; TODO: connect these two

  let stopWords=["and", "the", "of"];

  document.getElementById("stopWordsBoxPref").value = stopWords.toString().replaceAll(",", " ");


  document.getElementById('generateButton').onclick = () => 
  {
    let userPrefs = {
      padding: document.getElementById('paddingPref').value,
      numWords: document.getElementById('numWordsPref').value,
      minCount: document.getElementById('minCountPref').value,
      fontSize: document.getElementById('fontSizePref').value,
      stopWord: document.getElementById('stopWordsPref').checked,
      lightness: document.getElementById('lightnessPref').checked,
      semantic: document.getElementById('semanticPref').checked,
      color: Array.from(document.querySelectorAll('div#colorPref input')).map(d => d.value), //convert to array (because it's actually a nodelist) and create array of hex color values
      rectBounding: document.getElementById('rectBoundingPref').checked,
      circleBounding: document.getElementById('circleBoundingPref').checked
    }

    console.log(userPrefs);

    let fileInput = document.getElementById("fileInput");
    let textInput = document.getElementById("rawTextInput");

    document.getElementById("wordCloudPreview").childNodes.forEach(function(d) //clear wordCloudPreview box
    {
      document.getElementById("wordCloudPreview").removeChild(d);
    });

    if(fileInput.files.length>0 || textInput.value.length>0)
    {
      let allWords;
      if(fileInput.files.length>0)
      {
        console.log(fileInput);

        let file = fileInput.files[0];
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function()
        {
          allWords = parseText(reader.result, userPrefs);
          addCloudToHTML(allWords, userPrefs);
        };
      }
      else
      {
        allWords = parseText(textInput.value, userPrefs);
        addCloudToHTML(allWords, userPrefs);
      }
    }
  }

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
    console.log(stopWords);
  };

  function parseText(textStr, userPrefs) {
    let words = textStr.split('\n').join(' ').split('\r').join(' ').split(' ');
    let cleanWords = words.map(word => word.replace(/[“”."!,]/g, ""))
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
    console.log(textArr)
    let wordsFreq = []
    for(let i = 0; i < Object.keys(wordsDict).length; i++){
      let thisWord = {text: textArr[i], frequency: freqArr[i]}
      wordsFreq.push(thisWord)
    }

    wordsFreq = wordsFreq.sort((e, f) => (e.frequency < f.frequency) ? 1 : -1); //sort in descending order

    //

    return wordsFreq;
  }

  function addCloudToHTML(allWords, userPrefs) //is there a better name for this? It's just sort of random things I had to separate because of the file loading event
  {
    let newWords = allWords.slice(0, Math.min(allWords.length, userPrefs.numWords)); //if there are more words in text than user specified, remove the extra
    while(newWords.length>0 && allWords.length0 && newWords[newWords.length-1].frequency === allWords[newWords.length].frequency)
    { //remove words one at a time until there are no cases of a word being in the list while another word with the same frequency is not in the list
      newWords.pop();
    }

    let cloud = createCloud(newWords, userPrefs);
    document.getElementById("wordCloudPreview").append(cloud);

    let extraWords1 = Array.from(cloud.childNodes).filter(d => (d['__data__'].x>dim/2 || d['__data__'].x<0-dim/2 || d['__data__'].y>dim/2 || d['__data__'].y<0-dim/2)).map(d => d['__data__']);
    //^words that were too big to include (didn't fit); note: this is only words that were placed but are too big to be shown, not words that hypothetically wouldn't fit

    document.getElementById("extraWords").style.display = "block";
    document.getElementById("extraWordsList").innerHTML = "";
    let extraWords = extraWords1.concat(allWords.filter(d => !newWords.includes(d))); //words that were too big or too small to include
    let i = 0;
    while(i<extraWords.length && i<100)
    {
      document.getElementById("extraWordsList").innerHTML+="<li>"+extraWords[i].text+", "+extraWords[i].frequency+" occurences</li>";
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

    let color1;
    let color2;

    if(userPrefs.lightness)
    {
      let labColorLight = userPrefs.color.map(function(d)
      {
        let col = d3.lab(d);
        col.l = 100;
        return col;
      });
      let labColorDark = userPrefs.color.map(function(d)
      {
        let col = d3.lab(d);
        col.l = 40;
        return col;
      });

      color1 = labColorLight[0];
      color2 = labColorDark[0];
    }
    else
    {
      color1 = userPrefs.color[0];
      color2 = userPrefs.color[0];
    }
    
    let colorScale1 = d3.scaleLinear()
      .domain([1, d3.max(words, d => d.frequency)])
      .range([color1, color2])
      .interpolate(d3.interpolateLab);

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
          .attr("fill", d => colorScale1(d.frequency))
          .attr("x", d => d.x+dim/2) //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
          .attr("y", d => d.y+dim/2)
          .text(d => d.text);
      });

    words.forEach(function(d){
      d.fontSize = sizeScale(d.frequency);
    });

    cloud.start();
    console.log(svg.node());
    return svg.node();
  }
})

