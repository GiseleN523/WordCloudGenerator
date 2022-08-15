require.config({  //add configurations; in this case, specifying the link to d3 here so we don't need it every time we want to use d3
    paths: {
      'd3': "https://d3js.org/d3.v7.min",
    }
  });
  
requirejs(['d3.layout.cloud', 'd3'], function(app, d3) //requires d3.layout.cloud.js and d3 (defined above)
{

  let dim = 600;

  let words = [ //descending order by size
    {text: "data", size: 15},
    {text: "frequency", size: 12},
    {text: "words", size: 10},
    {text: "spiral", size: 8},
    {text: "clouds", size: 7},
    {text: "padding", size: 7},
    {text: "margin", size: 6},
    {text: "font-size", size: 3}
  ];

  function scaleSize(d)
  {
    return Math.sqrt(d)*15;
  }

  colorScale = d3.scaleLinear()
    .domain([1, d3.max(words, d => scaleSize(d.size))])
    .range(['#e6e6ff', '#0000cc'])
    .interpolate(d3.interpolateLab);

  let svg = d3.create("svg")
    .attr("width", dim)
    .attr("height", dim);

  let cloud = app()
    .words(words)
    .size([dim, dim])
    .font("sans-serif")
    .rotate(0)
    .fontSize(d => scaleSize(d.size))
    .padding(10)
    .on("end", function() //when cloud generation is finished, create text in svg element
    {
      svg.selectAll("text")
        .data(words)
        .join("text")
        .attr("font-size", d => d.size)
        .attr("font-family", d => d.font)
        .attr("text-anchor", "middle") //important
        .attr("fill", d => colorScale(d.size))
        .attr("x", d => d.x+dim/2) //coordinates assume (0, 0) is the center and will be negative if they're to the left/top of the center point, so adjust here
        .attr("y", d => d.y+dim/2)
        .text(d => d.text);
    });

  cloud.start();

  console.log(svg.node());

  document.getElementById("div1").append(svg.node());

});
