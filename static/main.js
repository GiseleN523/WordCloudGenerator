//this is the functionality specific to our site that references html+css and builds on the more generic app.js (which can also be importable into observable)
define(['d3', 'app', 'https://sharonchoong.github.io/svg-exportJS/svg-export.min.js'], function(d3, app, svgExportJS)
{

  let fileUploadLast = false; //keeps track of whether a file has been uploaded or the textarea input changed more recently, to know which one to use when generating

  let colorSchemes = [d3.schemeTableau10, d3.schemeSet1, d3.schemeDark2, d3.schemeSet2, d3.schemeCategory10, ["#e60049", "#0bb4ff", "#50e991", "#e6d800", "#9b19f5", "#ffa300", "#dc0ab4", "#b3d4ff", "#00bfa0"], ["#b30000", "#7c1158", "#4421af", "#1a53ff", "#0d88e6", "#00b7c7", "#5ad45a", "#8be04e", "#ebdc78"]];
  let colorSchemesText = ["Color Scheme 1", "Color Scheme 2", "Color Scheme 3", "Color Scheme 4", "Color Scheme 5", "Color Scheme 6", "Color Scheme 7"];
  colorSchemesText.forEach(d => document.getElementById("groupColorPref").innerHTML+='<option value="'+d+'">'+d+'</option>');
  document.querySelectorAll("#customColors input").forEach((d, i) => d.value = colorSchemes[0][i]);

  document.getElementById("stopWordsBoxPref").value = app.stopWords.toString().replaceAll(",", " "); //populate stop words textarea with app's default stopwords

  document.getElementById('generateButton').onclick = function()
  {
    document.getElementById("showAllWords").checked = false;
    app.dimPref = 700; //if changed, must also be changed in styles.css; TODO: connect these two
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
  
    let fileInput = document.getElementById("fileInput");
    let textInput = document.getElementById("rawTextInput");

    document.getElementById("wordCloudPreview").innerHTML = ""; //clear previous word cloud

    if(fileUploadLast && fileInput.files.length>0) //create cloud from file input
    {
      let reader = new FileReader();
      reader.readAsText(fileInput.files[0]);
      reader.onload = function()
      {
        app.createCloud(reader.result, () => displayCloud(app.svg.node()));
      };
    }
    else if(!fileUploadLast && textInput.value.length>0) //create file from textarea input box
    {
      app.createCloud(textInput.value, () => displayCloud(app.svg.node()));
    }
  }

  //is this unnecessary? will it actually help at all, or will it just confuse people?
  document.getElementById("rectBoundingPref").onchange, document.getElementById("circleBoundingPref").onchange = function()
  {
    if(document.getElementById("rectBoundingPref").checked || document.getElementById("circleBoundingPref").checked)
    {
      document.getElementById("fontSizePref").max = 50;
      document.getElementById("paddingPref").max = 20;
    }
    else
    {
      document.getElementById("fontSizePref").max = 80;
      document.getElementById("paddingPref").max = 10;
    }
  }

  document.getElementById("fontSizePref").onchange = (e) => document.getElementById("fontSizeLabel").innerHTML = e.target.value;

  document.getElementById("paddingPref").onchange = (e) => document.getElementById("paddingLabel").innerHTML = e.target.value;

  document.getElementById("semanticPref").onchange = (e) => document.getElementById("semanticLabel").innerHTML = e.target.value;

  document.getElementById("groupColorPref").onchange = () => document.querySelectorAll("#customColors input").forEach((d, i) => d.value = colorSchemes[colorSchemesText.indexOf(document.getElementById("groupColorPref").value)][i]);
  
  document.getElementById("fileInput").onchange = (e) => e.target.files.length>0 ? fileUploadLast = true : fileUploadLast = false;

  document.getElementById("rawTextInput").onchange = (e) => e.target.value.length>0 ? fileUploadLast = false : fileUploadLast = true;

  document.getElementById("stopWordsPref").onchange = (e) => e.target.checked ? document.getElementById("stopWordsBoxPrefDiv").style.display = "block" : document.getElementById("stopWordsBoxPrefDiv").style.display = "none";

  document.getElementById("stopWordsBoxPref").onchange = () => app.stopWords = document.getElementById("stopWordsBoxPref").value.split(" ");

   //load more words to list of "extra words" if user approaches the bottom of currently loaded list
  document.getElementById("extraWordsList").onscroll = function() {
    let extraWordsElem = document.getElementById("extraWordsList");
    if(extraWordsElem.scrollTop + extraWordsElem.clientHeight + 20 >= extraWordsElem.scrollHeight) 
    {
      appendToExtraWordsList(100);
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

  function displayCloud(svg)
  {    
    document.getElementById("wordCloudPreview").append(svg);

    document.getElementById("downloadSvgButton").style.display = "block";
    document.getElementById("downloadSvgButton").onclick = () => svgExportJS.downloadSvg(app.svg.node(), "yourwordcloud");

    document.getElementById("wordCount").innerHTML = " | Number of Unique Words (excluding stop words): "+(app.words.length+app.extraWords.length);

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
