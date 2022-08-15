require.config({  //add configurations; in this case, specifying the link to d3 here so we don't need it every time we want to use d3
    paths: {
      'd3': "https://d3js.org/d3.v7.min",
    }
  });
  
requirejs(['main']); //launch from main.js