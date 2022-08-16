define(['d3.layout.cloud', 'd3'], function(d3cloud, d3)
{

  let dim = 700; //if changed, must also be changed in styles.css; TODO: connect these two

  document.getElementById('generateButton').onclick = () => 
  {
    let userPrefs = {
      padding: document.getElementById('paddingPref').value,
      numWords: document.getElementById('numWordsPref').value,
      minCount: document.getElementById('minCountPref').value,
      stopWord: document.getElementById('stopWordsPref').checked,
      lightness: document.getElementById('lightnessPref').checked,
      semantic: document.getElementById('semanticPref').checked,
      semanticColor: document.getElementById('semanticColorPref').checked,
      rectBounding: document.getElementById('rectBoundingPref').checked
    }

    console.log(userPrefs);

    let fileInput = document.getElementById("fileInput");
    let textInput = document.getElementById("rawTextInput");
    let text;

    if(fileInput.files.length>0)
    {
      console.log(fileInput);

      let file = fileInput.files[0];
      let reader = new FileReader();
      reader.readAsText(file);
      reader.addEventListener("load", () => 
      {
        let words = parseText(reader.result, userPrefs);
        console.log(words);
        document.getElementById("wordCloudPreview").append(createCloud(words, userPrefs));
      });
    }
    else if(textInput.value.length>0)
    {
      let words = parseText(textInput.value, userPrefs);
      console.log(words);
      document.getElementById("wordCloudPreview").append(createCloud(words, userPrefs));
    }
  }

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
    if(wordsFreq.length>userPrefs.numWords)
    {
      return wordsFreq.splice(0, userPrefs.numWords);
    }
    else
    {
      return wordsFreq;
    }
  }

  function createCloud(words, userPrefs)
  {
    let svg = d3.create("svg")
      .attr("width", dim)
      .attr("height", dim);

    let sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(words, d => d.frequency)])
        .range([0, 80])

    let colorScale = d3.scaleLinear()
      .domain([1, d3.max(words, d => d.frequency)])
      .range(['#e6e6ff', '#0000cc'])
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
          .attr("fill", d => colorScale(d.frequency))
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

