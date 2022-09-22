//this is our word cloud functionality that we could import into Observable

define(['d3', 'https://cdn.jsdelivr.net/gh/jasondavies/d3-cloud@master/build/d3.layout.cloud.js', 'parser'], function(d3, d3cloud, parser)
{

  let defaultStop = "should would could also i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs themselves what which who whom this that these those am is are was were be been being have has had having do does did doing a an the and but if or because as until while of at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just should now"

  return {
    stopWords : defaultStop.split(" "), 
    extraWords : [], //words that aren't stop words but weren't included in the cloud for various reasons
    dimPref : 700,
    paddingPref : 3,
    numWordsPref : 100,
    minCountPref : 1,
    fontSizePref : 50,
    stopWordPref : true,
    lightnessPref : true,
    semanticPref : 5,
    colorPref : d3.schemeTableau10,
    rectBoundingPref : false,
    circleBoundingPref : false,
    createCloud : function(wordsRaw, onEndFunction) //function to call when cloud is done, passed by main
    {
      wordsParsed = parser.parseText(wordsRaw, this.stopWords, this.stopWordPref, this.semanticPref);
      this.words = wordsParsed.slice(0, Math.min(wordsParsed.length, this.numWordsPref)); //if there are more words in text than user specified, remove the extra
      while(this.words.length>0 && (this.words[this.words.length-1].frequency<=this.minCountPref || (this.words.length<wordsParsed.length && this.words[this.words.length-1].frequency === wordsParsed[this.words.length].frequency)))
      { //remove words one at a time until there are no cases of a word being in the list while another word with the same frequency is not in the list, and also remove words with frequency less than minfrequency pref
        this.words.pop();
      }

      this.words.forEach(d => d.semGroup++); //since we still have group -1, increase all semantic group numbers by 1 to make them >=0
      
      let sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(this.words, d => d.frequency)])
        .range([0, this.fontSizePref])

      this.words.forEach(function(d){
        d.fontSize = sizeScale(d.frequency);
      });

      this.svg = d3.create("svg")
        .attr("width", this.dimPref)
        .attr("height", this.dimPref);

      if(this.circleBoundingPref)
      {
        this.setCircleSvg(onEndFunction);
      }
      else if(this.rectBoundingPref)
      {
        let context = document.createElement("canvas").getContext("2d");
        context.font = "10px "+this.words[0].font;

        let widestWord = this.words[0];
        this.words.forEach(function(d) //find widest word, which we'll use to determine width for all bounding boxes
        {
          if(context.measureText(widestWord.text).width<context.measureText(d.text).width)
          {
            widestWord = d;
          }
        });
        context.font = widestWord.fontSize+"px "+widestWord.font;

        let widestWordWidth = context.measureText(widestWord.text).width;
        let fillerStr="";
        while(context.measureText(fillerStr).width<=widestWordWidth)
        {//create string composed of Full Block characters that is at least as long as the width of the widest word
          fillerStr+=String.fromCharCode(9608);
        }
        fillerStr+=String.fromCharCode(9608);
        //this filler string is what will be fed to d3-cloud to place, guaranteeing any potential ascenders and descenders are accounted for in placement
        //as far as d3-cloud knows, words of the same frequency/font size will be completely identical, and all words are made up of identical characters, just scaled using font size

        let fillerWords = []; //create array of "filler words", which will be placed by d3-cloud instead of this.words
        this.words.forEach(d => fillerWords.push({
            text : fillerStr,
            realWord : d,
            fontSize : d.fontSize,
            font : d.font,
            frequency : d.frequency,
            semGroup : d.semGroup
        }));
        this.setWithoutBoundingOrRectSvg(fillerWords, onEndFunction);
      }
      else
      {
        this.setWithoutBoundingOrRectSvg(this.words, onEndFunction);
      }
  },
  
  setWithoutBoundingOrRectSvg : function(wordsToUse, onEndFunction) //wordsToUse is a necessary parameter because when there are rectangular bounding boxes, a fillerWords array must be fed to this method instead of this.words
  {
    let wordsSplit = [];
    for(let i=0; i<=d3.max(wordsToUse, d => d.semGroup); i++)
    {
      wordsSplit.push(wordsToUse.filter(d => d.semGroup==i))
    } //create 2d array, splitting given words into separate arrays by semGroup attribute

    let app = this; //save object here, otherwise we won't have access to it once we call d3-cloud
    for(let i=0; i<wordsSplit.length; i++) //iterate through each semantic group and individually place them using d3-cloud
    {
      let cloud = d3cloud()
        .words(wordsSplit[i])
        .size([this.dimPref, this.dimPref])
        .font("sans-serif")
        .rotate(0)
        .fontSize(d => d.fontSize)
        .padding(this.paddingPref)
        .random(() => .5) //important; always start each word's spiral in center so that largest words are in center
        .on("end", function()
        {
          let date = new Date();
          let time = date.getTime();
          if(i===wordsSplit.length-1) //when cloud generation is finished and all semantic groups have been placed:
          {
            let tempSvg = d3.create("svg") //temporary svg we will use to run force simulation on without interfering with real svg that is visible
              .attr("width", app.dimPref)
              .attr("height", app.dimPref);

            wordsSplit.forEach(function(p)
            {
              let boundsX = [d3.min(p, d => d.x+d.x0), d3.max(p, d => d.x+d.x1)];
              let boundsY = [d3.min(p, d => d.y+d.y0), d3.max(p, d => d.y+d.y1)];
              p.radius = Math.max(boundsX[1]-boundsX[0], boundsY[1]-boundsY[0])/2;
            }) //calculate approximate largest distance across each semantic group and use this to find a radius if it were a circle

            let node = tempSvg.selectAll("circle") //based on Yan Holtz (https://d3-graph-gallery.com/graph/circularpacking_basic.html)
              .data(wordsSplit)
              .join("circle")
              .attr("r", d => d.radius)
              .attr("cx", app.dimPref/2)
              .attr("cy", app.dimPref/2)

            let simulation = d3.forceSimulation()
              .force("center", d3.forceCenter(app.dimPref/2, app.dimPref/2))
              .force("charge", d3.forceManyBody().strength(.2))
              .force("collide", d3.forceCollide(wordsSplit).strength(.2).radius(d => d.radius))

            simulation //run force simulation to pack semantic groups (imagining they are circles) without them colliding
              .nodes(wordsSplit)
              .alphaMin([0.75]) //only run simulation 25% of the way, to get an approximation that doesn't take as long
              .on("tick", function(){
                node
                  .attr("cx", d => d.x)
                  .attr("cy", d => d.y)

              })
              .on("end", function() //when the simulation is finished and groups have been placed:
              {
                let date1 = new Date();
                console.log(date1.getTime()-date.getTime())
                for(let i=0; i<wordsSplit.length; i++)
                {
                  for(let j=0; j<wordsSplit[i].length; j++)
                  {
                    let word = wordsSplit[i][j];
                    if(app.rectBoundingPref)
                    {//in the case of rectangular bounding boxes, the current "words" are just fillerWords, so relay all the coordinate information just determined to their realWord attribute (their corresponding word in app.words)
                      word.realWord.x = word.x+wordsSplit[i].x;
                      word.realWord.y = word.y+wordsSplit[i].y;
                      let context = document.createElement("canvas").getContext("2d");
                      context.font = word.realWord.fontSize+"px "+word.realWord.font;
                      word.realWord.width = context.measureText(word.text).width; //d3-cloud rounds width up to the nearest 32 pixels, so calculate the word's real width here in order to make sure bounding boxes aren't unnecessarily wide
                      word.realWord.height = word.fontSize*1.25;
                      word.realWord.x0 = -word.realWord.width/2;
                      word.realWord.x1 = word.realWord.x0*-1;
                      word.realWord.y0 = word.y0-(word.realWord.fontSize*.1);
                      word.realWord.y1 = word.realWord.y0*-1;
                    }
                    else
                    {//adjust each word by the x and y coordinates for their semantic group, since all the groups are currently in the corner
                      word.x += wordsSplit[i].x;
                      word.y += wordsSplit[i].y;
                    }
                  }
                }
                app.createSvg(onEndFunction);
              });
          }
        });
      cloud.start();
    };
  },

  setCircleSvg : function(onEndFunction)
  {
    let wordsBySemGroup = [];
    for(let i=0; i<=d3.max(this.words, d => d.semGroup); i++) //create structure needed for d3 circle packing
    {
      wordsBySemGroup.push({"children" : this.words.filter(d => d.semGroup==i)})
    }
    let root = d3.hierarchy({
      "children" : wordsBySemGroup})
      .sum(d => d.hasOwnProperty("frequency") ? d.frequency : 0);

    let pack = d3.pack()
      .padding(this.paddingPref)
      .size([this.dimPref, this.dimPref]);

    pack(root); //use d3 circle packing to pack hierarchial circles (although the parent ones will be invisible)

    root.descendants().forEach(function(d)
    {
      d.data.x = d.x; //add x, y, and r coords to data, AKA that item in words array, so they're more easily accessible
      d.data.y = d.y;
      d.data.r = d.r;
    });
    this.createSvg(onEndFunction);
  },

  createSvg : function(onEndFunction)
  {
    this.colorPref.unshift("#444444"); //add gray to colors list for "-1" ungrouped group
    
    let hslColors = this.colorPref.map(d => d3.hsl(d)); //convert color list to hsl so we can manipulate lightness value

    let lightnessScale = d3.scaleLinear()
        .domain([0, d3.max(this.words, d => d.frequency)])
        .range([.8, .4]);

    if(this.circleBoundingPref)
    {
      this.svg.selectAll("circle")
        .data(this.words)
        .join("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .attr("fill", d => this.lightnessPref ? d3.hsl(hslColors[d.semGroup].h, hslColors[d.semGroup].s, lightnessScale(d.frequency)) : hslColors[d.semGroup])
        .attr("stroke", "black")
        .attr("cursor", function(d){
          d.shapeSvg = this; //save circle in word object--not sure where else to do it
          return "pointer";
        })
        .on('mouseover', (event, d) => showWordFreqTooltip(d)) //is there a better way to get the source?
        .on('mouseout', (event, d) => hideWordFreqTooltip(d));
    }

    if(this.rectBoundingPref)
    {
      this.svg.selectAll("rect")
        .data(this.words)
        .join("rect")
        .attr("x", d => d.x0+d.x)
        .attr("y", d => d.y0+d.y)
        .attr("width", d => d.width)
        .attr("height", d => d.height)
        .attr("fill", d => this.lightnessPref ? d3.hsl(hslColors[d.semGroup].h, hslColors[d.semGroup].s, lightnessScale(d.frequency)) : hslColors[d.semGroup])
        .attr("stroke", "black")
        .attr("cursor", function(d){
          d.shapeSvg = this; //save rectangle in word object--not sure where else to do it
          return "pointer";
        })
        .on('mouseover', (event, d) => showWordFreqTooltip(d)) 
        .on('mouseout', (event, d) => hideWordFreqTooltip(d));
      this.words.forEach(function(d)
      {
        let context = document.createElement("canvas").getContext("2d");
        context.font = d.fontSize+"px "+d.font;
        d.y -= context.measureText(d.text).actualBoundingBoxDescent/2;
      })
    }

    this.svg.selectAll("text")
      .data(this.words)
      .join("text")
      .attr("font-size", d => d.fontSize)
      .attr("font-family", d => d.font)
      .attr("text-anchor", "middle") //important for rendering in the way d3-cloud intended
      .attr("alignment-baseline", this.circleBoundingPref ? "middle" : "auto")
      .attr("fill", (this.circleBoundingPref || this.rectBoundingPref) ? "black" : (d => this.lightnessPref ? d3.hsl(hslColors[d.semGroup].h, hslColors[d.semGroup].s, lightnessScale(d.frequency)) : hslColors[d.semGroup]))
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("cursor", function(d){
        d.textSvg = this; //save text in word object--not sure where else to do it
        return "pointer";
      })
      .attr("semGroup", d => d.semGroup)
      .text(d => d.text)
      .on('mouseover', (event, d) => showWordFreqTooltip(d))
      .on('mouseout', (event, d) => hideWordFreqTooltip(d));

    //I'm really confused by this line and I don't remember where I was getting some of this from; should it be separated out into more lines?
    let extraWordsTemp = Array.from(document.querySelectorAll('#cloud text')).filter(d => (d['__data__'].x>this.dimPref/2 || d['__data__'].x<0-this.dimPref/2 || d['__data__'].y>this.dimPref/2 || d['__data__'].y<0-this.dimPref/2)).map(d => d['__data__']);
    //^words that were too big to include (didn't fit); note: this is only words that were placed but are too big to be shown, not words that hypothetically wouldn't fit
    this.extraWords = extraWordsTemp.concat(wordsParsed.filter(d => !this.words.includes(d))); //words that were too big or too small to include

    this.svg.append('rect')
      .attr('id', 'wordFreqTooltipBackground')
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('rx', '5')
      .attr('display', 'none');

    this.svg.append('text')
      .attr('id', 'wordFreqTooltip')
      .attr('font-size', '16')
      .attr('display', 'none');

    function showWordFreqTooltip(word)
    {
      d3.select('#wordFreqTooltip')
        .text(word.text+": "+word.frequency+" instances")
        .attr('x', word.x)
        .attr('y', word.y+25)
        .attr("text-anchor", "middle")
        .attr('display', 'block');
      d3.select(word.textSvg).attr('font-weight', 'bold');
      if(word.shapeSvg!=undefined)
      {
        d3.select(word.shapeSvg).attr('stroke-width', '3');
      }
      let context = document.createElement("canvas").getContext("2d");
      context.font = document.getElementById("wordFreqTooltip").getAttribute("font-size")+"px sans-serif";
      let width = context.measureText(document.getElementById("wordFreqTooltip").innerHTML).width;
      let height = document.getElementById("wordFreqTooltip").getAttribute("font-size");
      d3.select("#wordFreqTooltipBackground")
        .attr('height', parseInt(height)+6)
        .attr('width', width+6)
        .attr('x', (word.x-width/2)-3)
        .attr('y', (word.y+height/2)+2)
        .attr('display', 'block');
    }

    function hideWordFreqTooltip(word)
    {
      d3.select('#wordFreqTooltip').attr('display', 'none');
      d3.select("#wordFreqTooltipBackground").attr('display', 'none');
      d3.select(word.textSvg).attr('font-weight', 'normal');
      if(word.shapeSvg!=undefined)
      {
        d3.select(word.shapeSvg).attr('stroke-width', '1');
      }
    }
    onEndFunction(); //finally call function that was passed by main at the beginning of createCloud() to perform at end of cloud generation
  }
};
});