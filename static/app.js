//this is our word cloud functionality that we could import into Observable

define(['d3.layout.cloud', 'd3','parser'], function(d3cloud, d3, parser)
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
            let words = wordsParsed.slice(0, Math.min(wordsParsed.length, this.numWordsPref)); //if there are more words in text than user specified, remove the extra
            while(words.length>0 && (words[words.length-1].frequency<=this.minCountPref || (words.length<wordsParsed.length && words[words.length-1].frequency === wordsParsed[words.length].frequency)))
            { //remove words one at a time until there are no cases of a word being in the list while another word with the same frequency is not in the list, and also remove words with frequency less than minfrequency pref
                words.pop();
            }

            let svg = d3.create("svg")
              .attr("width", this.widthPref)
              .attr("height", this.heightPref);

            //document.getElementById("wordCloudPreview").append(svg.node()); //for debugging purposes, to see layout created word by word

            let color = d3.hsl(this.colorPref[0]);

            let sizeScale = d3.scaleSqrt()
                .domain([0, d3.max(words, d => d.frequency)])
                .range([0, this.fontSizePref])

            let lightnessScale = d3.scaleLinear()
                .domain([0, d3.max(words, d => d.frequency)])
                .range(this.lightnessPref ? [.9, .5] : [color.l, color.l])

            if(this.rectBoundingPref)
            {
              words.forEach(function(d){
                d.fontSize = sizeScale(d.frequency);
              });

              let fillerWords = []; //fake words to "trick" d3-cloud into thinking words of the same frequency are all the same dimensions
              words.forEach((d) => fillerWords.push({
                text: String.fromCharCode(9608)+String.fromCharCode(9608)+String.fromCharCode(9608)+String.fromCharCode(9608)+String.fromCharCode(9608),
                frequency: d.frequency,
                semGroup: d.semGroup,
                fontSize: d.fontSize
              }));

              let cloud = d3cloud()
                .words(fillerWords)
                .size([this.widthPref, this.heightPref])
                .font("sans-serif")
                .rotate(0)
                .fontSize(d => d.fontSize)
                .padding(0)
                .random(() => .5) //important, overrides default placement function in d3-cloud and always starts spiral at center
                .on("end", function() //when cloud generation is finished, create text in svg element
                {
                    console.log(fillerWords);
                    let size = this.size();

                    let tempSvg = d3.create('svg').attr('height', 50).attr('width', 50)
  
                    fillerWords.forEach(function(d) //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
                    {
                      console.log(d);
                      d.x += size[0]/2;
                      d.y += size[1]/2;
                      /*let svg1 = "<svg width='200' height='200><text style ='font-size = '"+d.fontSize+"'; font-family: '"+d.font+"'>"+d.text+"</text></svg>";
                      let txt = d3.querySelectorAll("text");
                      console.log(txt);
                      console.log(svg1);
                      tempSvg.append("text")
                        .attr("font-size", d.fontSize)
                        .attr("font-family", d.font)
                        .text(d.text)
                      d.realWidth = tempSvg.children[tempSvg.children.length-1];*/
                    });

                    svg.selectAll("text")
                      .data(fillerWords)
                      .join("text")
                      .attr("font-size", d => d.fontSize)
                      .attr("font-family", d => d.font)
                      .attr("text-anchor", "middle") //important
                      .attr("fill", "black")
                      .attr("x", d => d.x)
                      .attr("y", d => d.y)
                      .attr("cursor", "pointer")
                      .attr("semGroup", d => d.semGroup)
                      .text(d => words[fillerWords.indexOf(d)].text)
                      .on('mouseover', (event, d) => showWordFreqTooltip(d))
                      .on('mouseout', (event, d) => hideWordFreqTooltip(d));

                    let i = 0;
                    while(i<svg.node().children.length)
                    {
                      fillerWords[i].width = svg.node().children[i].getBBox().width;
                      console.log(svg.node().children[i].getBBox())
                      i++;
                    }

                    svg.selectAll("rect")
                      .data(fillerWords)
                      .join("rect")
                      .attr("x", d => d.x+d.x0)//-d.realWidth/2)
                      .attr("y", d => d.y+d.y0)
                      .attr("width", d => d.width)//Math.abs(d.x0)+d.x1)//+d.realWidth/2)
                      .attr("height", d => Math.abs(d.y0)+d.y1-(d.fontSize*.6))
                      .attr("fill", d => d3.hsl(color.h, color.s, lightnessScale(d.frequency)))
                      .attr("stroke", "black")
                      .attr("cursor", "pointer")
                      .on('mouseover', (event, d) => showWordFreqTooltip(d))
                      .on('mouseout', (event, d) => hideWordFreqTooltip(d));

                    svg.selectAll("text")
                      .data(fillerWords)
                      .join("text")
                      .attr("font-size", d => d.fontSize)
                      .attr("font-family", d => d.font)
                      .attr("text-anchor", "middle") //important
                      .attr("fill", "black")
                      .attr("x", d => d.x)
                      .attr("y", d => d.y)
                      .attr("cursor", "pointer")
                      .attr("semGroup", d => d.semGroup)
                      .text(d => words[fillerWords.indexOf(d)].text)
                      .on('mouseover', (event, d) => showWordFreqTooltip(d))
                      .on('mouseout', (event, d) => hideWordFreqTooltip(d));

                });
    
                cloud.start();
                console.log(svg.node());
            }
            else if(this.circleBoundingPref)
            {
              sizeScale = d3.scaleSqrt()
                .domain([0, d3.max(words, d => d.frequency)])
                .range([0, this.fontSizePref/2])

              let root = d3.hierarchy({
                "children" : words})
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

              svg.selectAll("circle")
                .data(root.descendants().filter(d => d.height===0).map(d => d.data)) //only add circles to leaves, then look at data, AKA that item in words array
                .join("circle")
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .attr("r", d => d.r)
                .attr("fill", d => d3.hsl(color.h, color.s, lightnessScale(d.frequency)))
                .attr("stroke", "black")
                .attr("cursor", "pointer")
                .on('mouseover', (event, d) => showWordFreqTooltip(d))
                .on('mouseout', (event, d) => hideWordFreqTooltip(d));
                    
                svg.selectAll("text")
                  .data(root.descendants().filter(d => d.height===0).map(d => d.data)) //only add text to leaves, then look at data, that item in words array
                  .join("text")
                  .attr("font-size", d => d.fontSize)
                  .attr("font-family", d => d.font)
                  .attr("text-anchor", "middle")
                  .attr("dominant-baseline", "middle")
                  .attr("x", d => d.x)
                  .attr("y", d => d.y)
                  .attr("semGroup", d => d.semGroup)
                  .attr("cursor", "pointer")
                  .text(d => d.text)
                  .on('mouseover', (event, d) => showWordFreqTooltip(d))
                  .on('mouseout', (event, d) => hideWordFreqTooltip(d));
            }
            else
            {
              let cloud = d3cloud()
                .words(words)
                .size([this.widthPref, this.heightPref])
                .font("sans-serif")
                .rotate(0)
                .fontSize(d => d.fontSize)
                .padding(this.paddingPref)
                .random(() => .5) //important
                /*.on("word", function(newWord) //for debugging purposes, to see layout created word by word
                {
                    console.log(newWord);
                    svg.append("text")
                    .attr("font-size", newWord.fontSize)
                    .attr("font-family", newWord.font)
                    .attr("text-anchor", "middle") //important
                    .attr("fill", d3.hsl(color.h, color.s, lightnessScale(newWord.frequency)))
                    .attr("x", newWord.x) //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
                    .attr("y", newWord.y)
                    .attr("cursor", "pointer")
                    .attr("semGroup", newWord.semGroup)
                    .text(newWord.text)
                })*/
                .on("end", function() //when cloud generation is finished, create text in svg element
                {
                    let size = this.size();

                    words.forEach(function(d) //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
                    {
                      d.x += size[0]/2;
                      d.y += size[1]/2;
                    });

                    svg.selectAll("text")
                        .data(words)
                        .join("text")
                        .attr("font-size", d => d.fontSize)
                        .attr("font-family", d => d.font)
                        .attr("text-anchor", "middle") //important
                        .attr("fill", d => d3.hsl(color.h, color.s, lightnessScale(d.frequency)))
                        .attr("x", d => d.x)
                        .attr("y", d => d.y)
                        .attr("cursor", "pointer")
                        .attr("semGroup", d => d.semGroup)
                        .text(d => d.text)
                        .on('mouseover', (event, d) => showWordFreqTooltip(d))
                        .on('mouseout', (event, d) => hideWordFreqTooltip(d));
                });

                words.forEach(function(d){
                  d.fontSize = sizeScale(d.frequency);
                });
    
                cloud.start();
                console.log(svg.node());
            }

            let extraWordsTemp = Array.from(document.querySelectorAll('#cloud text')).filter(d => (d['__data__'].x>this.widthPref/2 || d['__data__'].x<0-this.heightPref/2 || d['__data__'].y>this.heightPref/2 || d['__data__'].y<0-this.widthPref/2)).map(d => d['__data__']);
            //^words that were too big to include (didn't fit); note: this is only words that were placed but are too big to be shown, not words that hypothetically wouldn't fit
            this.extraWords = extraWordsTemp.concat(wordsParsed.filter(d => !words.includes(d))); //words that were too big or too small to include

            svg.append('rect')
                .attr('id', 'wordFreqTooltipBackground')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 110)
                .attr('height', 20)
                .attr('fill', 'white')
                .attr('stroke', 'black')
                .attr('display', 'none');

            svg.append('text')
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
              //d.style['font-weight'] = 'bold';
              d3.select("#wordFreqTooltipBackground")
                .attr('x', d.x-55)
                .attr('y', d.y+5)
                .attr('display', 'block');
            }

            function hideWordFreqTooltip(d)
            {
              d3.select('#wordFreqTooltip').text("");
              d3.select('#wordFreqTooltip').attr('display', 'none');
              //d.style['font-weight'] = 'normal';
              d3.select("#wordFreqTooltipBackground").attr('display', 'none');
            }

            return svg.node();
        }
    };

});
