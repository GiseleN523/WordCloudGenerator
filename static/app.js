//this is our word cloud functionality that we could import into Observable

define(['https://cdn.jsdelivr.net/gh/jasondavies/d3-cloud@master/build/d3.layout.cloud.js', 'd3', 'parser'], function(d3cloud, d3, parser)
{
  
  let defaultStop = "should would could also i me my myself we our ours ourselves you your yours yourself yourselves he him his himself she her hers herself it its itself they them their theirs themselves what which who whom this that these those am is are was were be been being have has had having do does did doing a an the and but if or because as until while of at by for with about against between into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just should now"

    return {
        stopWords : defaultStop.split(" "), 
        extraWords : [], //words that aren't stop words but weren't included in the cloud for whatever reason
        widthPref : 700,
        heightPref: 700,
        paddingPref : 3,
        numWordsPref : 100,
        minCountPref : 1,
        fontSizePref : 50,
        stopWordPref : true,
        lightnessPref : true,
        semanticPref : true,
        colorPref : ["#ff0000"],
        rectBoundingPref : false,
        circleBoundingPref : false,
        createCloud : function(wordsRaw)
        {
          wordsParsed = parser.parseText(wordsRaw, this.stopWords, this.stopWordPref, this.semanticPref);
          this.words = wordsParsed.slice(0, Math.min(wordsParsed.length, this.numWordsPref)); //if there are more words in text than user specified, remove the extra
          while(this.words.length>0 && (this.words[this.words.length-1].frequency<=this.minCountPref || (this.words.length<wordsParsed.length && this.words[this.words.length-1].frequency === wordsParsed[this.words.length].frequency)))
          { //remove words one at a time until there are no cases of a word being in the list while another word with the same frequency is not in the list, and also remove words with frequency less than minfrequency pref
              this.words.pop();
          }
          //this.words = this.words.filter(d => d.semGroup>-1);
          this.words.forEach(d => d.semGroup++); //since we still have group -1, increase all semantic group numbers by 1 to make them >=0
          
          sizeScale = d3.scaleSqrt()
            .domain([0, d3.max(this.words, d => d.frequency)])
            .range([0, this.fontSizePref])

          this.words.forEach(function(d){
            d.fontSize = sizeScale(d.frequency);
          });

          this.svg = d3.create("svg")
            .attr("width", this.widthPref)
            .attr("height", this.heightPref);

          if(this.rectBoundingPref)
          {
            this.setRectSvg();
          }
          else if(this.circleBoundingPref)
          {
            this.setCircleSvg();
          }
          else
          {
            this.setSvgWithoutBoundingBox();
          }
      },

      setRectSvg : function()
      {
        let context = document.createElement("canvas").getContext("2d");
        context.font = "10px "+this.words[0].font;

        let widestWord = this.words[0];
        this.words.forEach(function(d)
        {
          if(context.measureText(widestWord.text).width<context.measureText(d.text).width)
          {
            widestWord = d;
          }
        });
        console.log(widestWord);
        context.font = widestWord.fontSize+"px "+widestWord.font;

        let widestWordWidth = context.measureText(widestWord.text).width;
        let fillerStr="";
        while(context.measureText(fillerStr).width<widestWordWidth+8)
        {
          fillerStr+=String.fromCharCode(9608);
        }

        let fillerWords = [];
        this.words.forEach(d => fillerWords.push({
            text : fillerStr,
            realWord : d,
            fontSize : d.fontSize,
            font : d.font,
            frequency : d.frequency,
            semGroup : d.semGroup
          })); //fake words to "trick" d3-cloud into thinking words of the same frequency are all the same dimensions

        fillerWords = this.splitBySemGroup(fillerWords);

        let app = this;
        for(let i=0; i<fillerWords.length; i++)
        {
          let cloud = d3cloud()
            .words(fillerWords[i])
            .size([this.widthPref, this.heightPref])
            .font("sans-serif")
            .rotate(0)
            .fontSize(d => d.fontSize)
            .padding(parseInt(this.paddingPref)+2) //so we can have a padding of 1 on the top and bottom
            .random(() => .5) //important, overrides default placement function in d3-cloud and always starts spiral at center
            .on("end", function() //when cloud generation is finished, create text in svg element
            {
              let size = this.size();
              fillerWords[i].forEach(function(d)
              {
                d.x += size[0]/2;
                d.y += size[1]/2;
                let realWord = d.realWord;
                realWord.x = d.x; //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
                realWord.y = d.y-(d.fontSize*.45)-(d.fontSize*.1);

                let context = document.createElement("canvas").getContext("2d");
                context.font = d.fontSize+"px "+d.font;
                realWord.width = context.measureText(d.text).width;
                realWord.x0 = d.x-realWord.width/2;
                realWord.x1 = d.x0*-1;
                realWord.height = Math.abs(d.y0)+d.y1-(d.fontSize*.9)+(d.fontSize*.2);
              });
              if(app.semanticPref && i==fillerWords.length-1)
              {
                let xDirections = [-1, 1, -1, 1];
                let yDirections = [-1, -1, 1, 1]
                let collisions = [true, true, true, true];
                let midGroup = fillerWords[d3.maxIndex(fillerWords, function(p)
                {
                  let boundsX = [d3.min(p, d => d.x+d.x0), d3.max(p, d => d.x+d.x1)];
                  let boundsY = [d3.min(p, d => d.y+d.y0), d3.max(p, d => d.y+d.y1)];
                  let radius = Math.max(boundsX[1]-boundsX[0], boundsY[1]-boundsY[0])/2;
                  return radius;
                })];
                fillerWords.splice(fillerWords.indexOf(midGroup), 1);
                let midGroupBoundsX = [d3.min(midGroup, d => d.x+d.x0), d3.max(midGroup, d => d.x+d.x1)] //bounds of the center group (in this case, the 3rd)
                let midGroupBoundsY = [d3.min(midGroup, d => d.y+d.y0), d3.max(midGroup, d => d.y+d.y1)]
                let midGroupRadius = Math.max(midGroupBoundsX[1]-midGroupBoundsX[0], midGroupBoundsY[1]-midGroupBoundsY[0])/2;
                let midGroupCenter = [(midGroupBoundsX[0]+midGroupBoundsX[1])/2, (midGroupBoundsY[0]+midGroupBoundsY[1])/2];
                while(collisions.includes(true))
                {
                  collisions = [false, false, false, false];
                  for(let i=0; i<fillerWords.length; i++)
                  {
                    let boundsX = [d3.min(fillerWords[i], d => d.x+d.x0), d3.max(fillerWords[i], d => d.x+d.x1)];
                    let boundsY = [d3.min(fillerWords[i], d => d.y+d.y0), d3.max(fillerWords[i], d => d.y+d.y1)];
                    let radius = Math.max(boundsX[1]-boundsX[0], boundsY[1]-boundsY[0])/2;
                    let center = [(boundsX[0]+boundsX[1])/2, (boundsY[0]+boundsY[1])/2];
                    if(midGroupRadius+radius > Math.sqrt(((midGroupCenter[0]-center[0])**2)+((midGroupCenter[1]-center[1])**2)))
                    {
                      collisions[i] = true;
                      fillerWords[i].forEach(function(d)
                      {
                        d.x += xDirections[i]*10;
                        d.y += yDirections[i]*10;
                        d.realWord.x = d.x; //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
                        d.realWord.y = d.y-(d.fontSize*.45)-(d.fontSize*.1);
                      })
                    }
                  }
                }
                app.createSvg();
              }
              else if(!app.semanticPref)
              {
                app.createSvg();
              }
            });
          cloud.start();
        }
      },
      setCircleSvg : function()
      {
        let wordsBySemGroup = [];
        for(let i=0; i<=d3.max(this.words, d => d.semGroup); i++)
        {
          wordsBySemGroup.push({"children" : this.words.filter(d => d.semGroup==i)})
        }
        let root = d3.hierarchy({
          "children" : wordsBySemGroup})
          .sum(d => d.hasOwnProperty("frequency") ? d.frequency : 0);

        let pack = d3.pack()
          .padding(this.paddingPref)
          .size([this.widthPref, this.heightPref]);

        pack(root);

        root.descendants().forEach(function(d)
        {
          d.data.x = d.x; //add x and y coords to data, AKA that item in words array, so they're more easily accessible
          d.data.y = d.y;
          d.data.r = d.r;
          d.data.fontSize = sizeScale(d.data.frequency);
          d.data.font = "sans-serif";
        });
        this.createSvg();
      },

      setSvgWithoutBoundingBox : function()
      {
        let wordsSplit = this.splitBySemGroup(this.words);
        this.splitWord = wordsSplit;

        let app = this;
        for(let i=0; i<wordsSplit.length; i++)
        {
          let cloud = d3cloud()
            .words(wordsSplit[i])
            .size([this.widthPref, this.heightPref])
            .font("sans-serif")
            .rotate(0)
            .fontSize(d => d.fontSize)
            .padding(this.paddingPref)
            .random(() => .5) //important
            .on("end", function() //when cloud generation is finished, create text in svg element
            {
              let size = this.size();
              wordsSplit[i].forEach(function(d)
              {  //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
                d.x += size[0]/2;
                d.y += size[1]/2;
                console.log(size[0]/2+" "+size[1]/2);
              });
              if(app.semanticPref && i==wordsSplit.length-1)
              {
                let xDirections = [-1, 1, -1, 1];
                let yDirections = [-1, -1, 1, 1]
                let collisions = [true, true, true, true];
                let midGroup = wordsSplit[d3.maxIndex(wordsSplit, function(p)
                {
                  let boundsX = [d3.min(p, d => d.x+d.x0), d3.max(p, d => d.x+d.x1)];
                  let boundsY = [d3.min(p, d => d.y+d.y0), d3.max(p, d => d.y+d.y1)];
                  let radius = Math.max(boundsX[1]-boundsX[0], boundsY[1]-boundsY[0])/2;
                  return radius;
                })];
                wordsSplit.splice(wordsSplit.indexOf(midGroup), 1);
                let midGroupBoundsX = [d3.min(midGroup, d => d.x+d.x0), d3.max(midGroup, d => d.x+d.x1)] //bounds of the center group (in this case, the 3rd)
                let midGroupBoundsY = [d3.min(midGroup, d => d.y+d.y0), d3.max(midGroup, d => d.y+d.y1)]
                let midGroupRadius = Math.max(midGroupBoundsX[1]-midGroupBoundsX[0], midGroupBoundsY[1]-midGroupBoundsY[0])/2;
                let midGroupCenter = [(midGroupBoundsX[0]+midGroupBoundsX[1])/2, (midGroupBoundsY[0]+midGroupBoundsY[1])/2];
                while(collisions.includes(true))
                {
                  collisions = [false, false, false, false];
                  for(let i=0; i<wordsSplit.length; i++)
                  {
                    let boundsX = [d3.min(wordsSplit[i], d => d.x+d.x0), d3.max(wordsSplit[i], d => d.x+d.x1)];
                    let boundsY = [d3.min(wordsSplit[i], d => d.y+d.y0), d3.max(wordsSplit[i], d => d.y+d.y1)];
                    let radius = Math.max(boundsX[1]-boundsX[0], boundsY[1]-boundsY[0])/2;
                    let center = [(boundsX[0]+boundsX[1])/2, (boundsY[0]+boundsY[1])/2];
                    if(midGroupRadius+radius > Math.sqrt(((midGroupCenter[0]-center[0])**2)+((midGroupCenter[1]-center[1])**2)))
                    {
                      collisions[i] = true;
                      wordsSplit[i].forEach(function(d)
                      {
                        d.x += xDirections[i]*10;
                        d.y += yDirections[i]*10;
                      })
                    }
                  }
                }
                app.createSvg();
              }
              else if(!app.semanticPref)
              {
                app.createSvg();
              }
            });
          cloud.start();
        };
      },

      createSvg : function()
      {
        console.log(this.words);

        if(this.colorPref[0]!=="#444444")
        {
          this.colorPref.unshift("#444444");
        }
        let hslColors = this.colorPref.map(d => d3.hsl(d));

        let lightnessScales = [];
        for(let i=0; i<hslColors.length; i++)
        {
          lightnessScales.push(d3.scaleLinear()
            .domain([0, d3.max(this.words, d => d.frequency)])
            .range(this.lightnessPref ? [.8, .4] : [hslColors[i].l, hslColors[i].l]));
        };

        if(this.circleBoundingPref)
        {
          this.svg.selectAll("circle")
            .data(this.words)
            .join("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => d.r)
            .attr("fill", d => d3.hsl(hslColors[d.semGroup].h, hslColors[d.semGroup].s, lightnessScales[d.semGroup](d.frequency)))
            .attr("stroke", "black")
            .attr("cursor", function(d){
              d.shapeSvg = this; //save circle in word object--not sure where else to do it
              return "pointer";
            })
            .on('mouseover', (event, d) => showWordFreqTooltip(d))
            .on('mouseout', (event, d) => hideWordFreqTooltip(d));
        }

        if(this.rectBoundingPref)
        {
          this.svg.selectAll("rect")
            .data(this.words)
            .join("rect")
            .attr("x", d =>  d.x-(d.width)/2)
            .attr("y", d => d.y-(d.height/2))
            .attr("width", d => d.width)
            .attr("height", d => d.height)
            .attr("fill", d => d3.hsl(hslColors[d.semGroup].h, hslColors[d.semGroup].s, lightnessScales[d.semGroup](d.frequency)))
            //.attr("rx", d => d.fontSize*.3)
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
          .attr("text-anchor", "middle") //important
          .attr("alignment-baseline", this.rectBoundingPref ? "mathematical" : "auto")
          .attr("fill", d => (this.circleBoundingPref || this.rectBoundingPref) ? "black" : d3.hsl(hslColors[d.semGroup].h, hslColors[d.semGroup].s, lightnessScales[d.semGroup](d.frequency)))
          .attr("x", d => d.x)
          .attr("y", function(d)
          {
            if(this.rectBoundingPref)
            {
              let context = document.createElement("canvas").getContext("2d");
              context.font = d.fontSize+"px "+d.font;
              realWord.width = context.measureText(d.text).width;
            }
            else
            {
              return d.y;
            }
          })
          .attr("cursor", function(d){
            d.textSvg = this; //save text in word object--not sure where else to do it
            return "pointer";
          })
          .attr("semGroup", d => d.semGroup)
          .text(d => d.text)
          .on('mouseover', (event, d) => showWordFreqTooltip(d))
          .on('mouseout', (event, d) => hideWordFreqTooltip(d));
    
        let extraWordsTemp = Array.from(document.querySelectorAll('#cloud text')).filter(d => (d['__data__'].x>this.widthPref/2 || d['__data__'].x<0-this.heightPref/2 || d['__data__'].y>this.heightPref/2 || d['__data__'].y<0-this.widthPref/2)).map(d => d['__data__']);
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
  
        function showWordFreqTooltip(d)
        {
          d3.select('#wordFreqTooltip')
            .text(d.text+": "+d.frequency+" instances")
            .attr('x', d.x)
            .attr('y', d.y+25)
            .attr("text-anchor", "middle")
            .attr('display', 'block');
          d3.select(d.textSvg).attr('font-weight', 'bold');
          if(d.shapeSvg!=undefined)
          {
            d3.select(d.shapeSvg).attr('stroke-width', '3');
          }
          let context = document.createElement("canvas").getContext("2d");
          context.font = document.getElementById("wordFreqTooltip").getAttribute("font-size")+"px sans-serif";
          let width = context.measureText(document.getElementById("wordFreqTooltip").innerHTML).width;
          let height = document.getElementById("wordFreqTooltip").getAttribute("font-size");
          d3.select("#wordFreqTooltipBackground")
            .attr('height', parseInt(height)+6)
            .attr('width', width+6)
            .attr('x', d.x-width/2-3)
            .attr('y', d.y+height/2+2)
            .attr('display', 'block');
        }
  
        function hideWordFreqTooltip(d)
        {
          d3.select('#wordFreqTooltip').text("");
          d3.select('#wordFreqTooltip').attr('display', 'none');
          d3.select(d.textSvg).attr('font-weight', 'normal');
          if(d.shapeSvg!=undefined)
          {
            d3.select(d.shapeSvg).attr('stroke-width', '1');
          }
          d3.select("#wordFreqTooltipBackground").attr('display', 'none');
        }
      },
      splitBySemGroup : function(arr)
      {
        let split = [];
        for(let i=0; i<=d3.max(arr, d => d.semGroup); i++)
        {
          split.push(arr.filter(d => d.semGroup==i))
        }
        return split;
      }
  };
});