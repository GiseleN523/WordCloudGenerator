# WordCloudGenerator

### Overview
A word cloud is a data visualization that encodes information about a text in the words themselves, often using a subset of the most common words to compare relative frequencies. Word clouds are one of the most user-friendly ways to visualize a text corpus — you can extract an interesting, engaging visualization with just a simple copy and paste! They have applications in education, journalism, data analysis, and the digital humanities and are even used in such prominent places as the New York Times. 

Word clouds are popular, but they easily become less effective when font size, rotation, and color are misused, and, additionally, because of perceptual biases that are inherent in a visualization like this. Our research group at Carleton College (Northfield, MN) decided to create a research-based word cloud generator, choosing features that would target specific biases common in word clouds. Our tool includes settings that allow the user to:
* control font size and padding
* edit a list of stop words
* specify a color scheme
* use lightness along with font size as a redundant encoding on word frequency
* split words into a given number of semantic groups
* choose the algorithm and training dataset used to determine the semantic grouping
* add either rectangular or circular bounding boxes around individual words for easier comparison

We also have a color-coded bar graph accompanying the cloud, so that the user can compare the words in another way and also examine words that were too infrequent to be in the word cloud itself.

### How to Run Our Code

Our project uses the Flask module, and you can launch the program using the wordcloud.py file, located in the root folder. Run this file (using the command `python wordcloud.py`) and you should receive a URL which you can paste into your browser to view our page locally hosted.

### Using the d3-cloud Library and Creating Clouds

The basis for our word cloud generator is [Jason Davies' d3-cloud javascript library](https://github.com/jasondavies/d3-cloud), which, in turn, is built using [D3](https://d3js.org/), a data visualization library for javascript that we also heavily relied upon. d3-cloud took the words and font sizes we fed in and placed them in a spiral shape (as is common with word clouds) without collisions. By looking at individual pixels, d3-cloud allowed us to closely pack words in the empty spaces left over and took care of what would otherwise have been tricky collision detection.

d3-cloud was very helpful for basic placing of the words, but there was still a lot of data preparation involved (getting user settings and reacting to them, counting the frequencies of each word in the text, calculating font size based on their frequency, and determining semantic groups), as well as work afterwards (transferring the coordinates given by d3-cloud into actual svg graphics, placing multiple clouds without them colliding when semantic groups are used, and adding in our own features like bounding boxes and lightness).

### Our Features

A word cloud with semantic grouping:

<img src="img/semantic_cloud.svg" alt="A word cloud with words grouped into five separate, color-coded, semantic-based groups" style="height: 400px"/>

A word cloud with semantic grouping and rectangular bounding boxes:

<img src="img/rectbounding_cloud.svg" alt="A word cloud with words color-coded and separated into semantic groups, along with proportionally scaled rectangular boxes around each word" style="height: 400px"/>

A word cloud with semantic grouping and circular bounding boxes:

<img src="img/circularbounding_cloud.svg" alt="A word cloud with words color-coded and separated into semantic groups, along with proportionally scaled circular boxes around each word" style="height: 400px"/>

Based on our research, we decided to use a redundant encoding of font size and lightness to make comparisons of the relative frequency of words easier. To do this, we used D3’s built-in scales, which allowed us to specify an input domain (for example, from 1 to the highest frequency in the current text) and receive a scaled output in the range we specified (for example, a font size between 10 and 40). In order to create an output range for lightness, we converted the user’s chosen color from the standard rgb (red, green, blue) format to hsl (hue, saturation, lightness). We decided to always scale the lightness between .8 and .4 to ensure that the small and big words would still be reasonably readable no matter the lightness of the original color the user chose.

We decided to implement options for both rectangular bounding boxes, like the ones previously tested by Dr. Alexander, and circular bounding boxes similar to a bubble chart. These had sizes proportioned based on the frequency or font size of words, so that all words of the same frequency had the same size bounding boxes and they could be more accurately compared.

We used [Sharon Choong's library](https://github.com/sharonchoong/svg-exportJS) to allow the user to download their cloud as an .svg file.

Semantic grouping is done using a combination of [Steve MacNeil's k-means clustering algorithm](https://github.com/stevemacn/kmeans) and several different vector models that the user can choose between:
* [Gensim's Google News Word2Vec Model](https://radimrehurek.com/gensim/index.html), more information [here](https://github.com/RaRe-Technologies/gensim-data)
* Gensim's Twitter GloVe Model
* Gensim's Wikipedia fastText Model
* [Anthony Liu's Google News Word2Vec Model](https://github.com/turbomaze/word2vecjson)
* [Nordic Language Processing Laboratory's (NLPL) Wikipedia Word2Vec Model](http://vectors.nlpl.eu)
* NLPL's Gigaword Word2Vec Model
* NLPL's British National Corpus Word2Vec Model

We wrote scripts that were used to save only the top 100,000 words (according to [this wordlist](https://www.kaggle.com/datasets/wheelercode/english-word-frequency-list), as some of the vector sets were quite large. Then we could read from these shorter and more consistently formatted files, instead of loading in the entire model. We fed each semantic group to d3-cloud separately to place as if it were its own cloud, and then we placed each small cloud. We used D3’s force simulation to approximately pack the smaller clouds as close together as possible while avoiding collisions. 

### The Web Interface

<img src="img/interface.png" alt="A screenshot of our User Interface" style="height: 1200px"/>

The main logic of our program was written using Javascript, but our website interface was written in HTML and CSS, as well as using Python’s Flask module. Our interface allows for file input and copy/paste raw text input.

Our code is modularized so that our basic word cloud generator functionality can be used on its own without the interface, if a user wanted to, for example, import it into [Observable Notebooks](observablehq.com). In order to import our code into Observable, we had to learn how to make sure it met the Asynchronous Module Definition (AMD) specification, a specific organizational format that is required by Observable. You can see an example of our code being used in Observable [here](https://observablehq.com/d/95aef5d4b44603b7).
