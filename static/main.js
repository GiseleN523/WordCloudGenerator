//this is the functionality specific to our site that references html+css and builds on the more generic app.js (which can also be importable into observable)
define(['d3', 'app', 'https://sharonchoong.github.io/svg-exportJS/svg-export.min.js'], function(d3, app, svgExportJS)
{
  let colorSchemes = [d3.schemeTableau10, d3.schemeSet1, d3.schemeSet2, d3.schemeDark2, d3.schemeCategory10, ["#e60049", "#0bb4ff", "#50e991", "#e6d800", "#9b19f5", "#ffa300", "#dc0ab4", "#b3d4ff", "#00bfa0"]];
  let colorSchemesText = ["Tableau 10", "Set 1", "Set 2", "Dark 2", "Category 10", "Dutch Field"];
  colorSchemesText.forEach(d => document.getElementById("groupColorPref").innerHTML+='<option value="'+d+'">'+d+'</option>');
  document.querySelectorAll("#customColors input").forEach((d, i) => d.value = colorSchemes[0][i]);

  app.initialize(.96*window.innerHeight);

  document.getElementById("wordCloudPreview").append(app.svg.node());
  document.getElementById("graph").append(app.graphSvg.node());

  //populate stop words textarea with app's default stopwords
  document.getElementById("stopWordsBoxPref").value = app.stopWords.toString().replaceAll(",", " ");
  
  document.getElementById("downloadSvgButton").onclick = () => svgExportJS.downloadSvg(app.svg.node(), "yourwordcloud");

  //when new text has been added and the whole cloud creation process needs to happen
  function createFromScratch(fileUpload)
  {
    let fileInput = document.querySelector("#fileInput input");
    let textInput = document.getElementById("rawTextInput");

    document.getElementById("showAllWords").checked = false;
    app.paddingPref = document.getElementById('paddingPref').value;
    app.numWordsPref = document.getElementById('numWordsPref').value;
    app.minCountPref = document.getElementById('minCountPref').value;
    app.fontSizePref = document.getElementById('fontSizePref').value;
    app.stopWordPref = document.getElementById('stopWordsPref').checked;
    app.lightnessPref = document.getElementById('lightnessPref').checked;
    app.semanticPref = document.getElementById('semanticPref').value;
    app.colorPref = Array.from(document.querySelectorAll('#customColors input')).map(d => d.value); //convert to array (because it's actually a nodelist) and create array of hex color values
    app.rectBoundingPref = document.getElementById('rectBoundingPref').checked;
    app.circleBoundingPref = document.getElementById('circleBoundingPref').checked;
    
    if(fileUpload && fileInput.files.length>0) //create cloud from file input
    {
      let reader = new FileReader();
      reader.readAsText(fileInput.files[0]);
      reader.onload = function()
      {
        app.initializeWords(reader.result);
        document.getElementById("wordCount").innerHTML = "Number of Unique Words (excluding stop words): "+app.wordsParsed.length;
        document.getElementById("downloadSvgButton").style.display = "inline";
        app.generateCoords(createExtraWordsList);
      };
    }
    else if(!fileUpload && textInput.value.length>0) //create file from textarea input box
    {
      app.initializeWords(textInput.value);
      document.getElementById("wordCount").innerHTML = "Number of Unique Words (excluding stop words): "+app.wordsParsed.length;
      document.getElementById("downloadSvgButton").style.display = "inline";
      app.generateCoords(createExtraWordsList);
    }
    else
    {
      document.getElementById("wordCount").innerHTML = "";
      app.svg.selectAll(".cloudshape").attr("display", "none"); //clear previous word cloud
      app.svg.selectAll(".cloudtext").text("");
      document.getElementById("downloadSvgButton").style.display = "none";
    }
  }

  document.querySelector("#fileInput input").onchange = function()
  {
    document.getElementById("rawTextInput").style.color = "#aaaaaa";
    if(document.querySelector("#fileInput input").value.length > 0)
    {
      document.querySelector("#fileInput span").innerHTML = document.querySelector("#fileInput input").value;
    }
    else
    {
      document.querySelector("#fileInput span").innerHTML = "Select A File";
    }
    createFromScratch(true);
  }
  document.getElementById("rawTextInput").onfocus = () => document.getElementById("rawTextInput").style.color = "black";
  document.getElementById("rawTextInput").onblur = function()
  {
    if(document.getElementById("rawTextInput").value.length > 0)
    {
      document.getElementById("rawTextInput").style.color = "black";
      document.querySelector("#fileInput span").innerHTML = "Select A File";
      createFromScratch(false);
    }
  }
  
  document.getElementById("numWordsPref").onchange = function()
  {
    if(document.getElementById('numWordsPref').value != app.numWordsPref)
    {
      app.updateWithNumWordsPref(document.getElementById('numWordsPref').value, createExtraWordsList);
    }
  }

  document.getElementById("minCountPref").onchange = function()
  {
    if(document.getElementById('minCountPref').value != app.minCountPref)
    {
      app.updateWithMinCountPref(document.getElementById('minCountPref').value, createExtraWordsList);
    }
  }

  document.getElementById("stopWordsPref").onchange = function(e)
  {
    if(e.target.checked)
    {
      document.getElementById("stopWordsBoxPrefDiv").style.display = "block";
      app.updateWithStopWordsPref(true);
    }
    else
    {
      document.getElementById("stopWordsBoxPrefDiv").style.display = "none";
      app.updateWithStopWordsPref(false);
    }
  }

  document.getElementById("stopWordsBoxPref").onchange = function()
  {
    app.updateWithStopWords(document.getElementById("stopWordsBoxPref").value.split(" "));
  }

  document.getElementById("fontSizePref").oninput = function(e)
  {
    document.getElementById("fontSizeLabel").innerHTML = e.target.value;
    if(app.fontSizePref != e.target.value)
    {
      app.changeFontSizeNoPositionUpdate(e.target.value);
    }
  }

  document.getElementById("fontSizePref").onchange = (e) => app.updateWithFontSizePref(parseInt(e.target.value));

  document.getElementById("paddingPref").oninput = (e) => document.getElementById("paddingLabel").innerHTML = e.target.value;

  document.getElementById("paddingPref").onchange = (e) => (app.paddingPref != e.target.value) ? app.updateWithPaddingPref(parseInt(e.target.value)) : null;

  document.getElementById("groupColorPref").oninput = function()
  {
    document.querySelectorAll("#customColors input").forEach((d, i) => d.value = colorSchemes[colorSchemesText.indexOf(document.getElementById("groupColorPref").value)][i]);
    app.updateWithColorPref(Array.from(document.querySelectorAll('#customColors input')).map(d => d.value)); //convert to array (because it's actually a nodelist) and create array of hex color values
  }

  document.querySelectorAll("#customColors input").forEach((d) => d.oninput = function()
  {
    app.updateWithColorPref(Array.from(document.querySelectorAll('#customColors input')).map(d => d.value)); //convert to array (because it's actually a nodelist) and create array of hex color values
  });

  document.getElementById("lightnessPref").oninput = () => app.updateWithLightnessPref(document.getElementById('lightnessPref').checked);

  document.getElementById("semanticPref").oninput = (e) => document.getElementById("semanticLabel").innerHTML = e.target.value;

  document.getElementById("semanticPref").onchange = (e) => (e.target.value != app.semanticPref) ? app.updateWithSemanticPref(e.target.value) : null;

  document.getElementById("rectBoundingPref").onchange = function()
  {
    document.getElementById("circleBoundingPref").checked = false;
    app.updateWithRectBoundingPref(document.getElementById('rectBoundingPref').checked);
  }
  
  document.getElementById("circleBoundingPref").onchange = function()
  {
    document.getElementById("rectBoundingPref").checked = false;
    app.updateWithCircleBoundingPref(document.getElementById('circleBoundingPref').checked);
  }

  function hideGroup(group) //hide/compress settings group and switch h3 (tab header) event listener to show/expand group when clicked
  {
    group.querySelectorAll(".prefGroupContent")[0].style.display = "none";
    group.querySelectorAll("h3")[0].onclick = (e) => showGroup(e.target.parentNode);
  }

  function showGroup(group) //show/expand settings group and switch h3 (tab header) event listener to hide/compress group when clicked
  {
    group.querySelectorAll(".prefGroupContent")[0].style.display = "block";
    group.querySelectorAll("h3")[0].onclick = (e) => hideGroup(e.target.parentNode);
  }

  //hide groups if their tab header is clicked
  document.querySelectorAll(".prefGroup h3").forEach((d) => d.onclick = (e) => hideGroup(e.target.parentNode));

  //load more words to list of "extra words" if user approaches the bottom of currently loaded list
  document.getElementById("extraWordsList").onscroll = function() {
    let extraWordsElem = document.getElementById("extraWordsList");
    if(extraWordsElem.scrollTop + extraWordsElem.clientHeight + 20 >= extraWordsElem.scrollHeight) 
    {
      appendToExtraWordsList(100);
    }
  };

  document.getElementById("graph").onscroll = function() {
    let graphElem = document.getElementById("graph");
    if(graphElem.scrollLeft + graphElem.clientWidth + 20 >= graphElem.scrollWidth)// && graphElem.scrollWidth < app.graphSvg.) 
    {
      let currentWid = app.graphSvg.attr("width").replace("%", "");
      app.graphSvg.attr("width", (Number(currentWid)+50)+"%");
    }
  };

  //either add or remove words that are in cloud to existing "extra words" list
  document.getElementById("showAllWords").onchange = function()
  {
    let currentNumExtraShown = document.querySelectorAll("#extraWordsList .extraWord").length;
    document.getElementById("extraWordsList").innerHTML="";
    if(document.getElementById("showAllWords").checked)
    {
      for(let i=0; i<app.words.length; i++)
      {
        document.getElementById("extraWordsList").innerHTML+="<li style='color: darkgray'>"+app.words[i].text+" : "+app.words[i].frequency+" instances</li>";
      }
      for(let i=0; i<currentNumExtraShown; i++)
      {
        document.getElementById("extraWordsList").innerHTML+="<li class='extraWord'>"+app.extraWords[i].text+" : "+app.extraWords[i].frequency+" instances</li>";
      }
    }
    else
    {
      appendToExtraWordsList(currentNumExtraShown);
    }
  }

  function createExtraWordsList()
  {
    document.getElementById("extraWords").style.display = "block";
    document.getElementById("extraWordsList").innerHTML = "";
    appendToExtraWordsList(100);
  }

  //add the given number of "extra words" to the list in the dom
  function appendToExtraWordsList(numToAdd)
  {
    let i = 0;
    let startingInd = document.getElementById("extraWordsList").children.length;
    while(i+startingInd<app.extraWords.length && i<numToAdd)
    {
      let word = app.extraWords[i+startingInd];
      document.getElementById("extraWordsList").innerHTML+="<li class='extraWord'>"+word.text+" : "+word.frequency+" instances</li>";
      i++;
    }
  }
})
