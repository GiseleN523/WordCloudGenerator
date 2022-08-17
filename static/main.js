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
    let words = textStr.split('\n').join(' ').split('\n').join(' ').split(' ');
    console.log(words);
    let wordsFreq = [];
    words.forEach(function(c) {
      let found = false;
      if(c.length > 0)
      {
        wordsFreq.forEach(function(b){
          if(c == b.text) {
            b.frequency++;
            found = true;
          }
        });
        if(found === false) {
          newWord = {text: c, frequency: 1};
          wordsFreq.push(newWord);
        }
      }
    });
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

    let labColorLight = userPrefs.color.map(function(d)
    {
      let col = d3.lab(d);
      col.l = 90;
      return col;
    });

    let labColorDark = userPrefs.color.map(function(d)
    {
      let col = d3.lab(d);
      col.l = 50;
      return col;
    });
    
    let colorScale1 = d3.scaleLinear()
      .domain([1, d3.max(words, d => d.frequency)])
      .range([labColorLight[0], labColorDark[0]])
      .interpolate(d3.interpolateLab);

    console.log(colorScale1(10))
    console.log(colorScale1(1))
    console.log(colorScale1(4))

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
});
