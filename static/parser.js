define(['wordvecs10000', 'kmeans'], function(vecs, kmeans) {
   
    vectsDict = vecs.getVecs();
    vectsArr = Object.values(vectsDict);
    k = 9;

    return { parseText: function(textStr, stopWords, stopWordPref) 
        {
            let words = textStr.split('\n').join(' ').split('\r').join(' ').split(' '); //condense into one split/some of this parsing generally
            let cleanWords = words.map(word => word.replace(/[;:\[\]()“”."!?,—*]/g, " ")) //dashes should convert to space not empty str
            cleanWords = cleanWords.map(word => word.replace(/[-_–]/g, " "))
            cleanWords.forEach(function(wordObj) {
              
            })
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
              let thisWord = {text: textArr[i], frequency: freqArr[i], semGroup: 0} //call function here that determines semantic group
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
    
            wordsFreq.forEach(function(wordObj) {
              wordObj.text = wordObj.text.trim()
            })
            wordsFreq = wordsFreq.sort((e, f) => (e.frequency <= f.frequency) ? 1 : -1); //sort in descending order
    
            //clustering fns below -- need organization!! and it worked but now it doesn't :(
            let toCluster = [] 
            let finInds = {}
            let rareWrds = []
            
            for(let i = 0; i < wordsFreq.length; i++) {  
              if(wordsFreq[i].text.toLowerCase() in vectsDict) {
                toCluster.push(vectsDict[wordsFreq[i].text.toLowerCase()])
                finInds[i] = wordsFreq[i].text
              }
              else {
                rareWrds.push(wordsFreq[i].text)
              }
            }
            
            
            groups = kmeans.getKmeans(toCluster, k, function(err, res) {
              if (err) throw new Error(err)
          
              else {
                //console.log(res)
              }
            })
            let indClusts = groups.sortedInd
            // let clustByWord = {} //upon return: make a functional cluster lookup here?
            //this is n^2 obvi. any workarounds?
            console.log(indClusts) //indexed groups
            for(let i = 0; i < k; i++) {
              for(let j = 0; j < indClusts[i].length; j++) {
                // console.log(indClusts[i][j])
                // console.log(finInds)
                indClusts[i][j] = finInds[indClusts[i][j]]
                //console.log(indClusts[i][j])
                // clustByWord[indClusts[i][j].text] = i  
              }
            }
    
            //how useful is the preprocessing?
            console.log(toCluster.length)
            console.log(wordsFreq.length)
            console.log(rareWrds.length)
            console.log(rareWrds)
    
            //end testing kmeans
            
            // wordsFreq.forEach(function(wordObj) {
            //   if(wordObj.text.toLowerCase() in vectsDict) {
            //     word
            //   }
            // })
            return wordsFreq
        }
    }
})