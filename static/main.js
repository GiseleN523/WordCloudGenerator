//this is the functionality specific to our site that references html+css and builds on the more generic app.js (which can also be importable into observable)
define(['app'], function(app)
{

  let dim = 700; //if changed, must also be changed in styles.css; TODO: connect these two

  //make file read here maybe or add default to html box

  let fileUploadLast = false; //keeps track of whether a file has been uploaded or the textarea input changed more recently, to know which one to use when generating

  document.getElementById("stopWordsBoxPref").value = app.stopWords.toString().replaceAll(",", " ");

  document.getElementById('generateButton').onclick = () => 
  {
    app.widthPref = dim;
    app.heightPref = dim;
    app.paddingPref = document.getElementById('paddingPref').value;
    app.numWordsPref = document.getElementById('numWordsPref').value;
    app.minCountPref = document.getElementById('minCountPref').value;
    app.fontSizePref = document.getElementById('fontSizePref').value;
    app.stopWordPref = document.getElementById('stopWordsPref').checked;
    app.lightnessPref = document.getElementById('lightnessPref').checked;
    app.semanticPref = document.getElementById('semanticPref').checked;
    app.colorPref = Array.from(document.querySelectorAll('div#colorPref input')).map(d => d.value); //convert to array (because it's actually a nodelist) and create array of hex color values
    app.rectBoundingPref = document.getElementById('rectBoundingPref').checked;
    app.circleBoundingPref = document.getElementById('circleBoundingPref').checked;
    console.log(app.circleBoundingPref);

    let fileInput = document.getElementById("fileInput");
    let textInput = document.getElementById("rawTextInput");

    document.getElementById("wordCloudPreview").childNodes.forEach(function(d) //clear wordCloudPreview box
    {
      document.getElementById("wordCloudPreview").removeChild(d);
    });

    if(fileUploadLast && fileInput.files.length>0)
    {
      let file = fileInput.files[0];
      let reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function()
      {
        let cloudData = app.createCloud(reader.result);
        displayCloud(cloudData);
      };
    }
    else if(!fileUploadLast && textInput.value.length>0)
    {
      let cloudData = app.createCloud(textInput.value);
      displayCloud(cloudData);
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
      document.getElementById("stopWordsBoxPref").value = app.stopWords.toString().replaceAll(",", " ");
    }
    else
    {
      document.getElementById("stopWordsBoxPrefDiv").style.display = "none;";
    }
  };

  document.getElementById("stopWordsBoxPref").onchange = function()
  {
    app.stopWords = document.getElementById("stopWordsBoxPref").value.split(" ");
  };

  document.getElementById("extraWordsList").onscroll = function() {
    let extraWordsElem = document.getElementById("extraWordsList");
    if(extraWordsElem.scrollTop + extraWordsElem.clientHeight + 20 >= extraWordsElem.scrollHeight) 
    {
      appendToExtraWordsList(100);
    }
  };

  function displayCloud(cloudData)
  {
    document.getElementById("wordCloudPreview").append(cloudData);

    document.getElementById("extraWords").style.display = "block";
    document.getElementById("extraWordsList").innerHTML = "";
    appendToExtraWordsList(100);
  }

  function appendToExtraWordsList(numToAdd)
  {
    let i = 0;
    console.log(app.extraWords);
    while(app.extraWords.length>0 && i<numToAdd)
    {
      let word = app.extraWords.shift(); //remove items from app's list of "extra words" as they get added to scroll box
      document.getElementById("extraWordsList").innerHTML+="<li>"+word.text+" : "+word.frequency+" instances</li>";
      i++;
    }
  }

  
})
