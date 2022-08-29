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
            wordsParsed = parser.parseText(wordsRaw, this.stopWords, this.stopWordPref);
            this.words = wordsParsed.slice(0, Math.min(wordsParsed.length, this.numWordsPref)); //if there are more words in text than user specified, remove the extra
            while(this.words.length>0 && (this.words[this.words.length-1].frequency<=this.minCountPref || (this.words.length<wordsParsed.length && this.words[this.words.length-1].frequency === wordsParsed[this.words.length].frequency)))
            { //remove words one at a time until there are no cases of a word being in the list while another word with the same frequency is not in the list, and also remove words with frequency less than minfrequency pref
                this.words.pop();
            }

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
        context.font = widestWord.fontSize+"px "+widestWord.font;

        let widestWordWidth = context.measureText(widestWord.text).width;
        let fillerStr="";
        while(context.measureText(fillerStr).width<widestWordWidth)
        {
          fillerStr+=String.fromCharCode(9608);
        }

        let fillerWords = [];
        this.words.forEach(d => fillerWords.push({
            text : fillerStr,
            fontSize : d.fontSize,
            font : d.font,
            frequency : d.frequency,
            semGroup : d.semGroup
          })); //fake words to "trick" d3-cloud into thinking words of the same frequency are all the same dimensions

        let app = this;

        let cloud = d3cloud()
          .words(fillerWords)
          .size([this.widthPref, this.heightPref])
          .font("sans-serif")
          .rotate(0)
          .fontSize(d => d.fontSize)
          .padding(parseInt(this.paddingPref)+2) //so we can have a padding of 1 on the top and bottom
          .random(() => .5) //important, overrides default placement function in d3-cloud and always starts spiral at center
          .on("end", function() //when cloud generation is finished, create text in svg element
          {
            fillerWords.forEach(function(d)
            {
              let realWord = app.words[fillerWords.indexOf(d)];
              realWord.x = d.x+app.widthPref/2; //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
              realWord.y = d.y+(app.heightPref/2)-(d.fontSize*.45)-1;
              //realWord.text = d.text;

              let context = document.createElement("canvas").getContext("2d");
              context.font = d.fontSize+"px "+d.font;
              realWord.width = context.measureText(d.text).width;
              realWord.x0 = d.x-(d.width/2);
              realWord.x1 = d.x0*-1;
              realWord.height = Math.abs(d.y0)+d.y1-(d.fontSize*.9)+2;
            });
            app.createSvg();
          });
        cloud.start();

      },
      setCircleSvg : function()
      {
        let root = d3.hierarchy({
          "children" : this.words})
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
        let app = this;
        let cloud = d3cloud()
          .words(this.words)
          .size([this.widthPref, this.heightPref])
          .font("sans-serif")
          .rotate(0)
          .fontSize(d => d.fontSize)
          .padding(this.paddingPref)
          .random(() => .5) //important
          .on("end", function() //when cloud generation is finished, create text in svg element
          {
            console.log(this.words);
            let size = this.size();
            app.words.forEach(function(d) //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
            {
              d.x += size[0]/2;
              d.y += size[1]/2;
            });
            app.createSvg();
          });
        cloud.start();
      },

      createSvg : function()
      {
        console.log(this.words);

        let color = d3.hsl(this.colorPref[0]);

        let lightnessScale = d3.scaleLinear()
          .domain([0, d3.max(this.words, d => d.frequency)])
          .range(this.lightnessPref ? [.9, .5] : [color.l, color.l])

        if(this.circleBoundingPref)
        {
          this.svg.selectAll("circle")
            .data(this.words)
            .join("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => d.r)
            .attr("fill", d => d3.hsl(color.h, color.s, lightnessScale(d.frequency)))
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
            .attr("fill", d => d3.hsl(color.h, color.s, lightnessScale(d.frequency)))
            //.attr("rx", d => d.fontSize*.3)
            .attr("stroke", "black")
            .attr("cursor", function(d){
              d.shapeSvg = this; //save rectangle in word object--not sure where else to do it
              return "pointer";
            })
            .on('mouseover', (event, d) => showWordFreqTooltip(d))
            .on('mouseout', (event, d) => hideWordFreqTooltip(d));
        }
  
        this.svg.selectAll("text")
          .data(this.words)
          .join("text")
          .attr("font-size", d => d.fontSize)
          .attr("font-family", d => d.font)
          .attr("text-anchor", "middle") //important
          .attr("alignment-baseline", "middle")
          .attr("fill", d => (this.circleBoundingPref || this.rectBoundingPref) ? "black" : d3.hsl(color.h, color.s, lightnessScale(d.frequency)))
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
  
        console.log(this.words);
  
        let extraWordsTemp = Array.from(document.querySelectorAll('#cloud text')).filter(d => (d['__data__'].x>this.widthPref/2 || d['__data__'].x<0-this.heightPref/2 || d['__data__'].y>this.heightPref/2 || d['__data__'].y<0-this.widthPref/2)).map(d => d['__data__']);
        //^words that were too big to include (didn't fit); note: this is only words that were placed but are too big to be shown, not words that hypothetically wouldn't fit
        this.extraWords = extraWordsTemp.concat(wordsParsed.filter(d => !this.words.includes(d))); //words that were too big or too small to include
        console.log(this.extraWords);
  
        this.svg.append('rect')
          .attr('id', 'wordFreqTooltipBackground')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 110)
          .attr('height', 20)
          .attr('fill', 'white')
          .attr('stroke', 'black')
          .attr('display', 'none');
  
        this.svg.append('text')
          .attr('id', 'wordFreqTooltip')
          .attr('font-size', '16')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 110)
          .attr('height', 10)
          .attr('border-radius', '3')
          .attr('display', 'none');
  
        function showWordFreqTooltip(d)
        {
          d3.select('#wordFreqTooltip')
            .text(d.frequency+" instances")
            .attr('x', d.x)
            .attr('y', d.y+20)
            .attr("text-anchor", "middle")
            .attr('display', 'block');
          d3.select(d.textSvg).attr('font-weight', 'bold');
          if(d.shapeSvg!=undefined)
          {
            d3.select(d.shapeSvg).attr('stroke-width', '3');
          }
          d3.select("#wordFreqTooltipBackground")
            .attr('x', d.x-55)
            .attr('y', d.y+5)
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
      }
  };
      
  function parseText(textStr, stopWords, stopWordPref) 
  {
  
      let words = textStr.split('\n').join(' ').split('\r').join(' ').split(' '); //condense into one split

      let cleanWords = words.map(word => word.replace(/[;:\[\]()“”."!?,—*]/g, "")) //dashes should convert to space not empty str
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
      for(let i = 0; i < textArr.length; i++){
        let thisWord = {text: textArr[i], frequency: freqArr[i], semGroup: 1} //call function here that determines semantic group
        wordsFreq.push(thisWord)
      }
  
      if(stopWordPref)
      {
          wordsFreq = wordsFreq.filter(x => stopWords.findIndex(el => {return el.toUpperCase() === x.text.toUpperCase()}) === -1);
      }

      indDict = {}
      let i = 0;
      wordsFreq.forEach(function(wordObj) {
        if(wordObj.text.toLowerCase() === 'constructor') {
          indDict[wordObj.text.toLowerCase() + '1'] = i;
        }
        indDict[wordObj.text] = i;
        i++;
      })
      toSpl = [];

      wordsFreq.forEach(function(wordObj) {
        let findMatch = -1;
        if(wordObj.text.toLowerCase() in indDict) {
          if(wordObj.text.toLowerCase() === 'constructor') {
            findMatch = indDict['constructor1'] ;
          }
          else {
            findMatch = indDict[wordObj.text.toLowerCase()] ;
          }
        }

        let matchFreq = -1;
        if(findMatch !== -1) {
          matchFreq = wordsFreq[findMatch].frequency;
        }
        let thisFreq = wordObj.frequency;
        if (findMatch !== -1 && wordsFreq[findMatch] !== wordObj) {
          if(thisFreq > wordsFreq[findMatch].frequency) {
            wordObj.frequency += matchFreq
            toSpl.push(findMatch)
          }
          else if (thisFreq <= matchFreq) {
            wordsFreq[findMatch].frequency += thisFreq
            toSpl.push(wordsFreq.indexOf(wordObj))
          }
        } 
      })
        
        toSpl.forEach(function(duplInd) {
          wordsFreq.splice(duplInd, 1)
        })

        wordsFreq = wordsFreq.sort((e, f) => (e.frequency <= f.frequency) ? 1 : -1); //sort in descending order

        //testing kmeans
        toCluster = [] // vectsArr //eventually change to []
        finInds = []
        rareWrds = []
        wordsFreq.forEach(function(wordObj) {
          if(wordObj.text in vectsDict) {
            toCluster.push(vectsDict[wordObj.text])
            finInds.push({i: wordObj.text})
          }
          else {
            rareWrds.push(vectsDict[wordObj.text])
          }
        })
        for(i = 0; i < toCluster.length; i++) {
          toCluster[i].push(i)
        }
        kmeans.getKmeans(toCluster, 4, function(err, res) {
          if (err) throw new Error(err)
      
          else {
            console.log(res)
          }
        })
        //end testing kmeans
        return wordsFreq
    }

});
