# takes a given vector model m (assumes format of Nordic Language Processing Laboratory's models) and reformats/saves the top n words (based on our frequency wordlist) to a .txt file
# run with python shortenWordList.py m n


import sys

readFromName = sys.argv[1]
numVectors = int(sys.argv[2])

file1 = open("eng_word_freq.csv", "r", encoding='Latin1') # wordlist: https://www.kaggle.com/datasets/wheelercode/english-word-frequency-list
dict_words = file1.readlines()
dict_words = dict_words[1:]
for ind in range(0, len(dict_words)):
    dict_words[ind] = dict_words[ind][:dict_words[ind].index(",")]
dict_words = dict_words[:numVectors]
file1.close()

newname = readFromName[0:readFromName.index(".")]+"_shortened.txt"
shorterVecs = open(newname, "w")

file2 = open(readFromName, "r", encoding='Latin1')

line = file2.readline()
size = (int)(line[:line.index(" ")])
count = 0

line = file2.readline()
while line:
    count = count + 1
    word = line[:line.index("_")]
    vecs = line[line.index(" "):]
    if word in dict_words:
        shorterVecs.write(word + vecs)
    if(count%1000==0):
        print(count," ",word," (",(count/size*100),"%)")
    line = file2.readline()

file2.close()
shorterVecs.close()
