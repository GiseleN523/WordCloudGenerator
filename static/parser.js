define(['wordvecs10000', 'kmeans'], function(vecs, kmeans) {
   
    vectsDict = vecs.getVecs();
    vectsArr = Object.values(vectsDict);
    k = 5;

    return { parseText: function(textStr, stopWords, stopWordPref, semPref) 
        {
            //initial tokenization
            let cleanText = textStr.split('\n').join(' ').split('\r').join(' ') //condense into one split?
            cleanText = cleanText.replace(/[;:\[\]()“”."!?,_—\*-]/g, " ") //trying to remove underscore led to removing caps
            let cleanWords = cleanText.split(' ')

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
            
            let wordsFreq = [] //array of text + frequency word objects
            for(let i = 0; i < textArr.length; i++){
              let thisWord = {text: textArr[i], frequency: freqArr[i], semGroup: 1} 
              wordsFreq.push(thisWord)
            }
        
            console.log(wordsFreq)

            if(stopWordPref)
            {
                wordsFreq = wordsFreq.filter(x => stopWords.findIndex(el => {return el.toUpperCase() === x.text.toUpperCase()}) === -1);
            }
            
            indDict = {} //creates dictionary of word text to index in wordsFreq, accomodating "constructor" exception - CHECK PLACEMENT + is it even used??
            let i = 0;
            wordsFreq.forEach(function(wordObj) {
              if(wordObj.text.toLowerCase() === 'constructor') {
                indDict[wordObj.text.toLowerCase() + '1'] = i;
              }
              else {
                indDict[wordObj.text] = i;
              }
              i++;
            })
    
            //checking for duplicate lowercase + uppercase words
            toSpl = []; //array of indices to remove later
            wordsFreq.forEach(function(wordObj) {
              let findMatch = -1;
              if(wordObj.text.toLowerCase() === 'constructor') {
                if(wordObj.text.toLowerCase() in indDict) {
                  findMatch = indDict['constructor1'] ;
                }            
              }
              else if(wordObj.text.toLowerCase() in indDict) {   
                findMatch = indDict[wordObj.text.toLowerCase()]
              }
    
              let matchFreq = -1;
              if(findMatch !== -1) { //i.e. if a match was found
                matchFreq = wordsFreq[findMatch].frequency;
              }
              let thisFreq = wordObj.frequency; //for comparing frequencies of lower and uppercase word versions

              if (findMatch !== -1 && wordsFreq[findMatch] !== wordObj) { //i.e. if a match was found and it's not just the original word object
                if(thisFreq > matchFreq) { //more uppercase
                  wordObj.frequency += matchFreq //combine freqs
                  toSpl.push(findMatch) //remove lowercase later
                }
                else if (thisFreq <= matchFreq) { //more lowercase
                  wordsFreq[findMatch].frequency += thisFreq //combine freqs
                  toSpl.push(wordsFreq.indexOf(wordObj)) //remove uppercase later
                }
              } 
            })
            
            //sort indices to remove in descending order
            toSpl = toSpl.sort((e, f) => (e <= f) ? 1 : -1);
            //then remove
            toSpl.forEach(function(duplInd) {
              wordsFreq.splice(duplInd, 1)
            })

            console.log(wordsFreq)

            wordsFreq = wordsFreq.sort((e, f) => (e.frequency <= f.frequency) ? 1 : -1); //sort in descending order

            //any extra white space?
            wordsFreq.forEach(function(wordObj) {
              wordObj.text = wordObj.text.trim()
            })
            
            console.log(wordsFreq)
    
            //clustering fns below -- need organization!!
            
            if(semPref) {
              let toCluster = [] 
              let rareWrds = []
              
              for(let i = 0; i < wordsFreq.length; i++) {  
                if(wordsFreq[i].text.toLowerCase() in vectsDict) {
                  toCluster.push(vectsDict[wordsFreq[i].text.toLowerCase()])
                }
                else {
                  rareWrds.push(wordsFreq[i].text)
                }
              }
              
              //make kmeans object using array of words found in wordvecs 
              groups = kmeans.getKmeans(toCluster, k, function(err, res) {
                if (err) throw new Error(err)
            
                else {
                  //console.log(res)
                }
              })
              let indClusts = groups.sortedInd //dictionary mapping array of vector indices according to toCluster to their index
              
              console.log(indClusts) //indexed groups
              ind = 0
              wordsFreq.forEach(function(wordObj) {
                if(wordObj.text.toLowerCase() in vectsDict) {
                  group = indClusts[ind]
                  wordObj.semGroup = group
                  if (typeof group === 'undefined') {
                    wordObj.semGroup = -2
                  }
                }
                else {
                  //alternate semgrouping function for wordFreq objs not in toCluster will go here, placeholder below:
                  wordObj.semGroup = -1
                }
                ind++
              })
              //testing print loop
              wordsFreq.forEach(function(wordObj) {
                console.log(wordObj.text)
                console.log(wordObj.semGroup)
              })
               //how useful is the preprocessing? tokenization errors! poorly trained dataset?
              console.log(toCluster.length)
              console.log(wordsFreq.length)
              console.log(rareWrds.length)
              console.log(rareWrds)
    
            }
            else {
              wordsFreq.forEach(function(wordObj) {
                wordObj.semGroup = 1
              })
            }
    
            return wordsFreq
        }
    }
})