# takes a given Gensim vector model m (which is in this directory) and formats/saves the top n (based on our frequency wordlist) to a .txt file
# run with python gensim_model_totxt.py m n
# see full model names at https://radimrehurek.com/gensim/models/word2vec.html, under "Pretrained models"

import gensim.downloader as g
import sys

modelname = sys.argv[1]
numVectors = int(sys.argv[2])

file1 = open("eng_word_freq.csv", "r", encoding='Latin1') # wordlist: https://www.kaggle.com/datasets/wheelercode/english-word-frequency-list
dict_words = file1.readlines()
file1.close()
print("frequency wordlist read")

writeToFile = open("gensim_" + modelname + ".txt", "w")
wv = g.load(modelname)
print("gensim model loaded")

count = 0
dictInd = 0
while count < numVectors:
    dictInd = dictInd + 1
    word = dict_words[dictInd][:dict_words[dictInd].index(",")]
    try:
        vec = word + " " + str(wv[word])
        vec = vec.replace("[", "").replace("]", "").replace("\n", "").replace("  ", " ") + "\n"
        writeToFile.write(vec)
        count = count + 1
    except KeyError:
        pass
    if(count%1000==0):
        print(count," ",word," (",(count/numVectors*100),"%)")

writeToFile.close()
